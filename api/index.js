const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Serve audio directory statically with proper audio/mpeg headers
app.get('/audio/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(process.cwd(), 'public', 'audio', filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }
  return res.status(404).json({ error: 'Audio file not found' });
});

// Bengali digit lookup
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBengaliNumber(num) {
  return num
    .toString()
    .split('')
    .map((char) => (BENGALI_DIGITS[char] !== undefined ? BENGALI_DIGITS[char] : char))
    .join('');
}

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

function getSlotKeyAndText(hour24, minute) {
  let targetHour = hour24;
  let targetMinute = 0;

  // Round minute to nearest 30-minute interval
  if (minute >= 15 && minute < 45) {
    targetMinute = 30;
  } else if (minute >= 45) {
    targetHour = (targetHour + 1) % 24;
    targetMinute = 0;
  } else {
    targetMinute = 0;
  }

  // Restrict to project boundary (06:00 to 22:00) with safe fallback
  if (targetHour < 6) targetHour = 6;
  if (targetHour > 22) targetHour = 22;

  const key = `${String(targetHour).padStart(2, '0')}-${targetMinute === 0 ? '00' : '30'}`;

  // Bengali grammar rules
  const period = getBengaliPeriod(targetHour);
  const hour12 = targetHour % 12 === 0 ? 12 : targetHour % 12;
  const bnHour = toBengaliNumber(hour12);

  let text = '';
  if (targetMinute === 30) {
    if (hour12 === 1) {
      text = `এখন ${period} দেড়টা বাজে`;
    } else if (hour12 === 2) {
      text = `এখন ${period} আড়াইটা বাজে`;
    } else {
      text = `এখন ${period} সাড়ে ${bnHour}টা বাজে`;
    }
  } else {
    text = `এখন ${period} ${bnHour}টা বাজে`;
  }

  return { key, text, targetHour, targetMinute };
}

async function handleTimeRequest(req, res) {
  try {
    let { hour24, minute } = getBangladeshTime();

    // Query parameter testing (e.g. ?time=13:30 or ?h=14&m=30)
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

    const { key, text, targetHour, targetMinute } = getSlotKeyAndText(hour24, minute);

    // Host domain: use Vercel URL
    const host = req.headers.host || 'alexa-bengali-time-api.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const audioUrl = `${protocol}://${host}/audio/${key}.mp3`;

    // Alexa-compliant SSML
    const ssml = `<speak><audio src="${audioUrl}" /></speak>`;

    const hour12 = targetHour % 12 === 0 ? 12 : targetHour % 12;
    const ampm = targetHour >= 12 ? 'PM' : 'AM';
    const formattedTime = `${String(hour12).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')} ${ampm}`;

    // Standard Alexa Skills Kit JSON format
    const responsePayload = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: ssml
        },
        shouldEndSession: true
      },
      // Extra metadata for debugging
      success: true,
      timezone: 'Asia/Dhaka (GMT+6)',
      currentTime: formattedTime,
      bengaliText: text,
      audioUrl: audioUrl
    };

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'দুঃখিত, সময় জানতে সমস্যা হয়েছে।'
        },
        shouldEndSession: true
      }
    });
  }
}

app.get('/api', handleTimeRequest);
app.get('/', handleTimeRequest);
app.post('/api', handleTimeRequest);
app.post('/', handleTimeRequest);

if (process.env.NODE_ENV !== 'production' && require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
