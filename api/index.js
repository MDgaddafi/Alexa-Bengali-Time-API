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

// Dynamic live minute generator: concatenates hour phrase + minute phrase
app.get('/audio/live-:h-:m.mp3', (req, res) => {
  try {
    const h = parseInt(req.params.h, 10);
    const m = parseInt(req.params.m, 10);
    const hPath = path.join(process.cwd(), 'public', 'audio', 'hours', `h${h}.mp3`);
    const mPath = path.join(process.cwd(), 'public', 'audio', 'minutes', `m${m}.mp3`);

    if (fs.existsSync(hPath) && fs.existsSync(mPath)) {
      const hBuf = fs.readFileSync(hPath);
      const mBuf = fs.readFileSync(mPath);
      const combined = Buffer.concat([hBuf, mBuf]);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', combined.length);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.end(combined);
    }
    return res.status(404).json({ error: 'Audio segment not found' });
  } catch (err) {
    console.error('Error combining audio:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve pre-rendered audio files statically
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
  if (hour24 >= 4 && hour24 < 6) {
    return 'ভোর';
  } else if (hour24 >= 6 && hour24 < 12) {
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

function getDynamicTimeData(hour24, minute) {
  const period = getBengaliPeriod(hour24);
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const bnHour = toBengaliNumber(hour12);
  const bnMinute = toBengaliNumber(minute);

  let text = '';
  let audioPath = '';

  // 1. Exact 00 minute mark
  if (minute === 0) {
    text = `এখন ${period} ${bnHour}টা বাজে`;
    const slotKey = `${String(hour24).padStart(2, '0')}-00`;
    // If we have pre-rendered file (6:00 to 22:00)
    if (hour24 >= 6 && hour24 <= 22) {
      audioPath = `/audio/${slotKey}.mp3`;
    } else {
      audioPath = `/audio/hours/h${hour24}.mp3`;
    }
  }
  // 2. Exact 30 minute mark (with special 1:30 and 2:30 exceptions)
  else if (minute === 30) {
    if (hour12 === 1) {
      text = `এখন ${period} দেড়টা বাজে`;
    } else if (hour12 === 2) {
      text = `এখন ${period} আড়াইটা বাজে`;
    } else {
      text = `এখন ${period} সাড়ে ${bnHour}টা বাজে`;
    }

    const slotKey = `${String(hour24).padStart(2, '0')}-30`;
    if (hour24 >= 6 && hour24 <= 22) {
      audioPath = `/audio/${slotKey}.mp3`;
    } else {
      audioPath = `/audio/live-${hour24}-30.mp3`;
    }
  }
  // 3. Any other dynamic minute (8:32, 8:33, 11:47, 24/7)
  else {
    text = `এখন ${period} ${bnHour}টা ${bnMinute} মিনিট বাজে`;
    audioPath = `/audio/live-${hour24}-${minute}.mp3`;
  }

  return { text, audioPath };
}

async function handleTimeRequest(req, res) {
  try {
    let { hour24, minute } = getBangladeshTime();

    // Query parameter testing (e.g. ?time=08:35 or ?h=14&m=32)
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

    const { text, audioPath } = getDynamicTimeData(hour24, minute);

    // Host domain: use Vercel URL
    const host = req.headers.host || 'alexa-bengali-time-api.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const fullAudioUrl = `${protocol}://${host}${audioPath}`;

    // Alexa-compliant SSML
    const ssml = `<speak><audio src="${fullAudioUrl}" /></speak>`;

    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const formattedTime = `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

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
      // Debugging metadata
      success: true,
      timezone: 'Asia/Dhaka (GMT+6)',
      currentTime: formattedTime,
      bengaliText: text,
      audioUrl: fullAudioUrl
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
