# Alexa Bengali Time API (বাংলাদেশ সময় - বাংলা ভয়েস)

A serverless Node.js Express backend API designed for **Amazon Alexa Routines** and **Echo Dot**. It detects the current Bangladesh time (GMT+6 / Asia/Dhaka), converts it into natural conversational Bengali following native grammar rules, converts the text to native Bengali speech via Google TTS, and responds with Alexa SSML format.

---

## 🌟 Features

- **Bangladesh Time (GMT+6)**: Accurate calculation using `Intl.DateTimeFormat` with `Asia/Dhaka` timezone regardless of the hosting server's timezone (Vercel uses UTC).
- **Native Bengali Grammar Rules**:
  - `00` Minutes: `"এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] [১-১২]টা বাজে"` (e.g., *এখন সকাল ৮টা বাজে*, *এখন দুপুর ১২টা বাজে*).
  - `30` Minutes: `"এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] সাড়ে [১-১২]টা বাজে"` (e.g., *এখন সকাল সাড়ে ৮টা বাজে*).
  - **Strict Exceptions for 30 mins**:
    - `1:30` -> `"দেড়টা"` (e.g., *এখন দুপুর দেড়টা বাজে*).
    - `2:30` -> `"আড়াইটা"` (e.g., *এখন দুপুর আড়াইটা বাজে*).
- **Google TTS**: Generates authentic native Bengali MP3 audio URL (`lang: 'bn'`).
- **Alexa SSML Compliance**: Escapes XML entities in audio URLs (`&` -> `&amp;`) and outputs `<audio src="URL" />` wrapped in `<speak>` tags.
- **Dual Support**: Works as a direct GET API, a Webhook trigger, and a full Alexa Custom Skill HTTPS endpoint.
- **Vercel Serverless Ready**: Zero configuration required, single file in `api/index.js`.

---

## 📁 Project Structure

```
├── api/
│   └── index.js         # Core logic: Timezone, Bengali converter, Google TTS, Express API
├── package.json         # Dependencies (express, google-tts-api)
├── vercel.json          # URL rewrite routing configuration
├── .gitignore
└── README.md
```

---

## 🚀 Step 1: Deploying to Vercel

### Option A: Using Vercel CLI (Fastest)

1. Open PowerShell or Terminal in this folder:
   ```bash
   cd "c:\Users\Astrum It\Documents\Ai all project\Alexa"
   ```
2. Install dependencies & Vercel CLI:
   ```bash
   npm install
   npm i -g vercel
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. Follow the on-screen prompts (Accept defaults).
5. For production release:
   ```bash
   vercel --prod
   ```

### Option B: Deploying via GitHub (Recommended for automatic updates)

1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Alexa Bengali Time API"
   ```
2. Create a new repository on [GitHub](https://github.com) and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/alexa-bengali-time.git
   git push -u origin main
   ```
3. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
4. Import your GitHub repository.
5. Keep default settings and click **Deploy**.
6. Once deployed, you will get your live URL, e.g.:
   `https://alexa-bengali-time.vercel.app`

---

## 🧪 Testing the API

After deployment, test the endpoints in your browser or Postman:

1. **Current Bangladesh Time:**
   ```
   https://your-project.vercel.app/api
   ```
2. **Test 1:30 PM Exception (দেড়টা):**
   ```
   https://your-project.vercel.app/api?time=13:30
   ```
   *Expected Output Text:* `"এখন দুপুর দেড়টা বাজে"`

3. **Test 2:30 PM Exception (আড়াইটা):**
   ```
   https://your-project.vercel.app/api?time=14:30
   ```
   *Expected Output Text:* `"এখন দুপুর আড়াইটা বাজে"`

4. **Test 8:00 AM:**
   ```
   https://your-project.vercel.app/api?time=08:00
   ```
   *Expected Output Text:* `"এখন সকাল ৮টা বাজে"`

5. **Test 8:30 AM:**
   ```
   https://your-project.vercel.app/api?time=08:30
   ```
   *Expected Output Text:* `"এখন সকাল সাড়ে ৮টা বাজে"`

---

## 🔊 Step 2: Triggering from Alexa Routine

There are two easy methods to connect this to your Echo Dot:

### Method 1: Alexa Custom Skill (Free & Official)

1. Go to [Amazon Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).
2. Click **Create Skill**:
   - Skill name: `Bangla Time`
   - Primary locale: `English (US)` or your Echo's locale
   - Model: **Custom**
   - Hosting: **Provision your own**
3. In the Left Menu, go to **Invocations** -> **Skill Invocation Name**:
   - Set to `bangla time` or `bengali time`
4. In the Left Menu, go to **Endpoint**:
   - Select **HTTPS**
   - In **Default Region**, paste your Vercel URL:
     `https://your-project.vercel.app/api`
   - In the SSL dropdown, select:
     `My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority`
   - Click **Save Endpoints**.
5. Click **Build Model** at the top.
6. Open the **Amazon Alexa App** on your phone:
   - Go to **More** -> **Routines** -> Tap **+**.
   - **When this happens**: Tap **Schedule** -> **At Time** -> Select your desired time (e.g., 6:00 AM, repeat daily).
   - **Add action**: Tap **Skills** -> **Your Skills** -> Select **Bangla Time**.
   - **From (Device)**: Select your **Echo Dot**.
   - Tap **Save**.
7. Create routines for every 30-minute interval (6:00 AM to 10:00 PM), or as needed.

---

### Method 2: Using Voice Monkey (Direct Webhook)

If you use [Voice Monkey](https://voicemonkey.io/) for smart home routines:
1. Connect your Voice Monkey account to Alexa.
2. In your Voice Monkey routine or trigger, trigger an audio playback using the `audioUrl` returned by this API.
