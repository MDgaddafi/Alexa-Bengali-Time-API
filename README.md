# Alexa Bengali Time API (বাংলাদেশ সময় - বাংলা ভয়েস)

A serverless Node.js Express backend API designed for **Amazon Alexa Routines** and **Echo Dot**. It detects the current Bangladesh time (GMT+6 / Asia/Dhaka), converts it into natural conversational Bengali following native grammar rules, and serves pre-processed native Bengali audio dynamically in real-time with Alexa SSML compliance.

---

## 🌟 Features

- **Bangladesh Time (GMT+6)**: Accurate calculation using `Intl.DateTimeFormat` with `Asia/Dhaka` timezone regardless of the hosting server's timezone (Vercel uses UTC).
- **24/7 Dynamic Real-Time Voice Engine**: Announces any exact minute of the day (e.g., *এখন সকাল ৮টা ৩৫ মিনিট বাজে*, *এখন রাত ১১টা ৪৭ মিনিট বাজে*) by dynamically concatenating high-quality voice segments on-the-fly with zero latency.
- **Native Bengali Grammar Rules**:
  - `00` Minutes: `"এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] [১-১২]টা বাজে"` (e.g., *এখন সকাল ৮টা বাজে*, *এখন দুপুর ১২টা বাজে*).
  - `30` Minutes: `"এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] সাড়ে [১-১২]টা বাজে"` (e.g., *এখন সকাল সাড়ে ৮টা বাজে*).
  - **Strict Exceptions for 30 mins**:
    - `1:30` -> `"দেড়টা"` (e.g., *এখন দুপুর দেড়টা বাজে*).
    - `2:30` -> `"আড়াইটা"` (e.g., *এখন দুপুর আড়াইটা বাজে*).
  - **Dynamic Any-Minute (1-59 mins)**: `"এখন [সময়কাল] [১-১২]টা [১-৫৯] মিনিট বাজে"` (e.g., *এখন সকাল ৮টা ৩৫ মিনিট বাজে*).
- **Zero-Latency Audio Stitching**: Uses pre-rendered & silence-trimmed MP3 snippets (24 hours + 59 minutes) combined on-the-fly at `/audio/live-:h-:m.mp3`.
- **Alexa SSML Compliance**: Escapes XML entities in audio URLs (`&` -> `&amp;`) and outputs `<audio src="URL" />` wrapped in `<speak>` tags.
- **Dual Support**: Works as a direct GET API, a Webhook trigger, and a full Alexa Custom Skill HTTPS endpoint.
- **Vercel Serverless Ready**: Zero configuration required, hosted serverlessly.

---

## 📁 Project Structure

```
├── api/
│   └── index.js                 # Core logic: Timezone, Dynamic Audio Concatenator, Express API
├── public/
│   └── audio/
│       ├── hours/               # 24 pre-rendered hour voice phrases (h0.mp3 - h23.mp3)
│       ├── minutes/             # 59 pre-rendered minute voice phrases (m1.mp3 - m59.mp3)
│       └── [06-00 to 22-30].mp3 # Pre-cached fixed 30-minute interval audio files
├── scripts/
│   ├── generate_audio.ps1       # Generates fixed interval audio files
│   └── gen_dynamic_snippets.ps1 # Generates 24-hour & 59-minute snippets via Google TTS & FFmpeg
├── package.json                 # Dependencies (express, google-tts-api)
├── vercel.json                  # URL rewrite routing configuration
├── .gitignore
└── README.md
```

---

## ⚡ How the 24/7 Dynamic Time Engine Works

### বাংলা সময় ঘোষণার কার্যপ্রণালী:
আগে শুধুমাত্র ৩০ মিনিট পর পর নির্দিষ্ট সময়ে সময় ঘোষণা করা যেত। কিন্তু এখন **২৪/৭ দিন-রাতের যেকোনো মিনিটে** Echo Dot সঠিক সময় লাইভ জানাতে পারে:

1. **Smart Audio Concatenation (তাৎক্ষণিক অডিও জোড়া লাগানো):**
   - সার্ভারে ২৪ ঘণ্টার জন্য ২৪টি প্রাক-রেকর্ড করা ভয়েস ফাইল (`/audio/hours/h0.mp3` থেকে `h23.mp3`) এবং ৫৯ মিনিটের জন্য ৫৯টি ফাইল (`/audio/minutes/m1.mp3` থেকে `m59.mp3`) আছে।
   - যেকোনো মিনিটে রিকোয়েস্ট এলে সার্ভার মিলিসেকেন্ডের মধ্যে বর্তমান ঘণ্টা এবং মিনিটের ফাইল দুটি জোড়া দিয়ে একটি পূর্ণাঙ্গ লাইভ অডিও (`/audio/live-:h-:m.mp3`) রিটার্ন করে। কোনো এক্সটার্নাল API কল না থাকায় রেসপন্স হয় একদম তাৎক্ষণিক!

2. **ন্যাচারাল বাংলা ব্যাকরণ নিয়ম (Native Grammar):**
   - **সরাসরি ঘণ্টা (`:00`):** `"এখন [সকাল/দুপুর/বিকেল/সন্ধ্যা/রাত] [১-১২]টা বাজে"`
   - **সরাসরি সাড়ে (`:30`):** `"এখন [সময়কাল] সাড়ে [১-১২]টা বাজে"`
     - *ব্যতিক্রম ১:৩০:* `"এখন দুপুর দেড়টা বাজে"`
     - *ব্যতিক্রম ২:৩০:* `"এখন দুপুর আড়াইটা বাজে"`
   - **যেকোনো অন্য মিনিট (`:০১` থেকে `:৫৯`):** `"এখন [সময়কাল] [১-১২]টা [১-৫৯] মিনিট বাজে"` (যেমন: *এখন সকাল ৮টা ৩৫ মিনিট বাজে*, *এখন রাত ১১টা ৪৭ মিনিট বাজে*)।

3. **অডিও ফাইল জেনারেট স্ক্রিপ্ট (ঐচ্ছিক):**
   - যদি নিজের ভয়েস বা নতুন অডিও স্নিপেট জেনারেট করতে চান, PowerShell-এ `scripts/gen_dynamic_snippets.ps1` স্ক্রিপ্টটি চালিয়ে নতুন অডিও ফাইল বানিয়ে নিতে পারবেন।

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

1. **Current Bangladesh Live Time (Dynamic):**
   ```
   https://your-project.vercel.app/api
   ```
   *Returns the exact current Bangladesh time and matching dynamic audio URL.*

2. **Test Dynamic Any-Minute (e.g., 8:35 AM):**
   ```
   https://your-project.vercel.app/api?time=08:35
   ```
   *Expected Output Text:* `"এখন সকাল ৮টা ৩৫ মিনিট বাজে"`  
   *Audio URL:* `https://your-project.vercel.app/audio/live-8-35.mp3`

3. **Test with `h` and `m` parameters (e.g., 2:15 PM):**
   ```
   https://your-project.vercel.app/api?h=14&m=15
   ```
   *Expected Output Text:* `"এখন দুপুর ২টা ১৫ মিনিট বাজে"`

4. **Test 1:30 PM Exception (দেড়টা):**
   ```
   https://your-project.vercel.app/api?time=13:30
   ```
   *Expected Output Text:* `"এখন দুপুর দেড়টা বাজে"`

5. **Test 2:30 PM Exception (আড়াইটা):**
   ```
   https://your-project.vercel.app/api?time=14:30
   ```
   *Expected Output Text:* `"এখন দুপুর আড়াইটা বাজে"`

6. **Test Exact Hour (8:00 AM):**
   ```
   https://your-project.vercel.app/api?time=08:00
   ```
   *Expected Output Text:* `"এখন সকাল ৮টা বাজে"`

7. **Direct Dynamic Audio Stream:**
   ```
   https://your-project.vercel.app/audio/live-8-35.mp3
   ```

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
   - In **Default Region**, paste your Vercel URL: `https://your-project.vercel.app/api`
   - In the SSL dropdown, select: `My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority`
   - Click **Save Endpoints**.
5. Click **Build Model** at the top. *(Also go to **Test** tab -> change "Test is disabled for this skill" to **Development**)*.
6. Open the **Amazon Alexa App** on your phone:
   - Go to **More** ➔ **Routines** ➔ Tap **+** (Add Routine).
   - রুটিনের নাম দিন (যেমন: `Bangla Time 6 AM`)।
   - **When this happens**: Tap **Schedule** ➔ **At Time** ➔ সময় সিলেক্ট করুন (যেমন: `6:00 AM`, Repeat: Daily)।
   - **Add action**:
     - তালিকার একদম উপরে থাকা **Custom** অপশনে ট্যাপ করুন *(যেখানে লেখা থাকে: "Alexa will: Custom" / "Type what you would say to Alexa")*।
     - টেক্সট বক্সে টাইপ করুন: `open bangla time`
     - **Next** চাপুন।
   - **Hear Alexa from (Device)**: আপনার **Echo Dot** সিলেক্ট করুন।
   - **Save** করে দিন।
7. Create routines for every 30-minute interval (6:00 AM to 10:00 PM), or as needed.

> 💡 **24/7 অন-ডিমান্ড লাইভ সময় শুনুন:**  
> রুটিন ছাড়াও আপনি দিন-রাতের যেকোনো সময় সরাসরি Echo Dot-কে বলতে পারেন:  
> 🗣️ **"Alexa, open bangla time"**  
> Echo Dot সাথে সাথে ডায়নামিকভাবে বর্তমান সঠিক মিনিটসহ বাংলাদেশ সময় ঘোষণা করবে!

---

### Method 2: Using Voice Monkey (Direct Webhook)

If you use [Voice Monkey](https://voicemonkey.io/) for smart home routines:
1. Connect your Voice Monkey account to Alexa.
2. In your Voice Monkey routine or trigger, trigger an audio playback using the `audioUrl` returned by this API.
