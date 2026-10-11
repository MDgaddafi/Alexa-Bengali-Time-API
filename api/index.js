const express = require('express');
const googleTTS = require('google-tts-api');

const app = express();

// Middleware to parse incoming JSON payloads (needed for Alexa Skill POST requests)
app.use(express.json());

// Enable CORS for testing from browsers and web clients
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Bengali digit lookup
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts an integer into Bengali numeral string
 * Example: 8 -> '৮', 12 -> '১২'
 */
function toBengaliNumber(num) {
  return num
    .toString()
    .split('')
    .map((char) => (BENGALI_DIGITS[char] !== undefined ? BENGALI_DIGITS[char] : char))
    .join('');
}

/**
 * Determines the Bengali period of the day based on 24-hour format
 * Covers 6:00 AM to 10:00 PM (and full 24h as fallback)
 * - 05:00 - 11:59: সকাল (Morning)
 * - 12:00 - 15:59: দুপুর (Noon / Early Afternoon)
 * - 16:00 - 17:59: বিকেল (Late Afternoon)
 * - 18:00 - 19:59: সন্ধ্যা (Evening)
 * - 20:00 - 23:59: রাত (Night)
 * - 00:00 - 04:59: রাত (Night)
 */
function getBengaliPeriod(hour24) {
  if (hour24 >= 5 && hour24 < 12) {
    return 'সকাল';
  } else if (hour24 >= 12 && hour24 < 16) {
    return 'দুপুর';
  } else if (hour24 >= 16 && hour24 < 18) {
    return 'বিকেল';
  } else if (hour24 >= 18 && hour24 < 20) {
    return 'সন্ধ্যা';
  } else {
    return 'রাত';
  }
}

/**
 * Gets current Bangladesh Time (GMT+6 / Asia/Dhaka)
 * Reliable across all hosting environments (including UTC servers on Vercel)
 */
function getBangladeshTime(customDate = null) {
  const date = customDate || new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    map[part.type] = part.value;
  }

  const hour24 = parseInt(map.hour, 10) % 24;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  return { hour24, minute, second };
}

/**
 * Converts hour and minute into conversational Bengali time string.
 *
 * Rules:
 * 1. 00-minute mark: "এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] [১-১২]টা বাজে"
 * 2. 30-minute mark: "এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] সাড়ে [১-১২]টা বাজে"
 * 3. Strict 30-minute exceptions:
 *    - 1:30 -> "এখন [সকাল/দুপুর/রাত] দেড়টা বাজে"
 *    - 2:30 -> "এখন [সকাল/দুপুর/রাত] আড়াইটা বাজে"
 */
function generateBengaliTimeString(hour24, minute) {
  // 12-hour format (1 - 12)
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = getBengaliPeriod(hour24);
  const bnHour = toBengaliNumber(hour12);

  // Check 30-minute mark (including +/- 2 minute routine trigger tolerance)
  if (minute === 30 || (minute >= 28 && minute <= 32)) {
    // Strict exceptions for 1:30 and 2:30
    if (hour12 === 1) {
      return `এখন ${period} দেড়টা বাজে`;
    }
    if (hour12 === 2) {
      return `এখন ${period} আড়াইটা বাজে`;
    }
    return `এখন ${period} সাড়ে ${bnHour}টা বাজে`;
  }

  // Check 00-minute mark (including tolerance for 58-59s or slight delay)
  let adjustedHour12 = hour12;
  let adjustedPeriod = period;

  if (minute >= 58) {
    // If Alexa triggers at 58-59 mins, align to the incoming top of the hour
    const nextHour24 = (hour24 + 1) % 24;
    adjustedHour12 = nextHour24 % 12 === 0 ? 12 : nextHour24 % 12;
    adjustedPeriod = getBengaliPeriod(nextHour24);
  }

  if (minute === 0 || minute <= 2 || minute >= 58) {
    return `এখন ${adjustedPeriod} ${toBengaliNumber(adjustedHour12)}টা বাজে`;
  }

  // Optional graceful fallback for non-00/30 test calls (e.g., 15 mins / 45 mins)
  if (minute === 15) {
    return `এখন ${period} সোয়া ${bnHour}টা বাজে`;
  }
  if (minute === 45) {
    const nextHour24 = (hour24 + 1) % 24;
    const nextHour12 = nextHour24 % 12 === 0 ? 12 : nextHour24 % 12;
    const nextPeriod = getBengaliPeriod(nextHour24);
    return `এখন ${nextPeriod} পৌনে ${toBengaliNumber(nextHour12)}টা বাজে`;
  }

  const bnMinute = toBengaliNumber(minute);
  return `এখন ${period} ${bnHour}টা ${bnMinute} মিনিট বাজে`;
}

/**
 * Main handler logic for both GET (browser/webhook) and POST (Alexa Custom Skill)
 */
async function handleTimeRequest(req, res) {
  try {
    let { hour24, minute, second } = getBangladeshTime();

    // Allow manual testing via query parameters (e.g. ?time=13:30 or ?h=14&m=30)
    if (req.query.time) {
      const [h, m] = req.query.time.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(h) && !isNaN(m)) {
        hour24 = h % 24;
        minute = m % 60;
      }
    } else if (req.query.h !== undefined && req.query.m !== undefined) {
      const h = parseInt(req.query.h, 10);
      const m = parseInt(req.query.m, 10);
      if (!isNaN(h) && !isNaN(m)) {
        hour24 = h % 24;
        minute = m % 60;
      }
    }

    // 1. Generate Bengali natural language speech text
    const bengaliText = generateBengaliTimeString(hour24, minute);

    // 2. Generate Google TTS audio URL in Bengali (bn)
    const audioUrl = googleTTS.getAudioUrl(bengaliText, {
      lang: 'bn',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
    });

    // 3. Escape XML entities in audio URL for Alexa SSML validity
    const escapedAudioUrl = audioUrl
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // 4. Construct SSML tags
    const audioTag = `<audio src="${escapedAudioUrl}" />`;
    const ssml = `<speak>${audioTag}</speak>`;

    // Format 12-hour display string for debugging
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const formattedTime = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

    // 5. Construct payload compatible with:
    //    - Direct Routine webhooks / Voice Monkey / browser
    //    - Alexa Skills Kit standard response
    const responsePayload = {
      success: true,
      timezone: 'Asia/Dhaka (GMT+6)',
      currentTime: formattedTime,
      bengaliText: bengaliText,
      audioUrl: audioUrl,
      audioTag: audioTag,
      ssml: ssml,
      // Alexa Custom Skill response standard structure
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: ssml
        },
        shouldEndSession: true
      }
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error handling time request:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
}

// Support both root "/" and "/api" endpoints (GET & POST)
app.get('/api', handleTimeRequest);
app.get('/', handleTimeRequest);
app.post('/api', handleTimeRequest);
app.post('/', handleTimeRequest);

// Start standalone HTTP server when executed directly (local development)
if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Alexa Bengali Time API server running on http://localhost:${PORT}`);
    console.log(`Test Bangladesh time: http://localhost:${PORT}/api`);
    console.log(`Test 1:30 PM exception: http://localhost:${PORT}/api?time=13:30`);
    console.log(`Test 2:30 PM exception: http://localhost:${PORT}/api?time=14:30`);
  });
}

// Export Express app for Vercel Serverless Function
module.exports = app;
