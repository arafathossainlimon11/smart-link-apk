const express = require('express');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// সেটিংস ও কনফিগারেশন
const BOT_TOKEN = "8716261561:AAEQFS3jR8VHI3hqvNQgEYxMUl09wMDObZM";
const DIRECT_AD_URL = "https://uplcm.com/4/11982343";
const POPUNDER_SCRIPT = `<script>(function(s){s.dataset.zone='11982337',s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`;

// টেলিগ্রাম মেসেজ পাঠানোর সহায়তামূলক ফাংশন
async function callTelegram(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (e) {
    console.error("Telegram API Error:", e);
    return null;
  }
}

// ১. টেলিগ্রাম বট ওয়েবহুক হ্যান্ডলার
app.post('/api/telegram', async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.trim();

    // /start কমান্ড
    if (text === '/start') {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: "👋 **স্বাগতম!**\n\nঅনুগ্রহ করে আপনার অনলাইন **ইমেজ হোস্ট লিংক** (Image URL) এখানে পাঠান। আমি আপনাকে হাই-স্পিড শর্ট লিংক বানিয়ে দেব।",
        parse_mode: 'Markdown'
      });
      return res.sendStatus(200);
    }

    // ইমেজ লিংক পাঠানো হলে
    if (text.startsWith('http://') || text.startsWith('https://')) {
      // প্রথমে ওয়েটিং মেসেজ পাঠানো
      const waitMsg = await callTelegram('sendMessage', {
        chat_id: chatId,
        text: "⏳ **অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন, আপনার শর্ট লিংক তৈরি হচ্ছে...**",
        parse_mode: 'Markdown'
      });

      // ইমেজের আসল লিংক ও ইউজারনেম হাইড (Mask) করার জন্য এনক্রিপশন
      const encodedCode = Buffer.from(text).toString('base64url');
      const host = req.get('host') || 'smart-link-apk.vercel.app';
      const shortUrl = `https://${host}/v/${encodedCode}`;

      const finalReply = `✅ **আপনার শর্ট লিংক সফলভাবে তৈরি হয়েছে!**\n\n🔗 **কপি করুন:**\n\`${shortUrl}\` \n\n📌 **কীভাবে ব্যবহার করবেন:**\nএটি ফেসবুকে পোস্ট করলে ছবির বড় প্রিভিউ দেখাবে। ইউজার ক্লিক করলে ৩ সেকেন্ড পর বিজ্ঞাপনে রিডাইরেক্ট হবে।`;

      // প্রসেসিং শেষে মেসেজ এডিট করে লিংক দেখানো
      if (waitMsg && waitMsg.result) {
        await callTelegram('editMessageText', {
          chat_id: chatId,
          message_id: waitMsg.result.message_id,
          text: finalReply,
          parse_mode: 'Markdown'
        });
      } else {
        await callTelegram('sendMessage', {
          chat_id: chatId,
          text: finalReply,
          parse_mode: 'Markdown'
        });
      }
    } else {
      await callTelegram('sendMessage', {
        chat_id: chatId,
        text: "⚠️ **ভুল ইনপুট!** অনুগ্রহ করে একটি সঠিক ইমেজের লিংক (`https://...`) পাঠান।",
        parse_mode: 'Markdown'
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(200);
  }
});

// ২. ইউজার ল্যান্ডিং পেজ (ফেসবুক কার্ড, এনক্রিপ্টেড ইমেজ ডিকোড ও অটো রিডাইরেক্ট)
app.get('/v/:code', (req, res) => {
  try {
    const code = req.params.code;
    // এনক্রিপ্টেড কোড থেকে অরিজিনাল পিকচার ইউআরএল বের করা
    const imageUrl = Buffer.from(code, 'base64url').toString('utf-8');
    const currentUrl = `${req.protocol}://${req.get('host')}/v/${code}`;

    res.send(`
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="monetag" content="4b78f101fbeec5762d4b6ea2ec0c9c6f">
        
        <!-- ফেসবুক ওপেন গ্রাফ মেটা ট্যাগ -->
        <meta property="og:title" content="Click to view full image">
        <meta property="og:description" content="Click the image to expand and view full content.">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${currentUrl}">
        <meta property="og:type" content="website">

        <title>Loading...</title>
        
        <!-- Monetag OnClick (Popunder) বিজ্ঞাপন -->
        ${POPUNDER_SCRIPT}

        <style>
          body { font-family: Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f172a; color: white; text-align: center; }
          .timer-box { font-size: 20px; font-weight: bold; background: rgba(255,255,255,0.1); padding: 15px 25px; border-radius: 30px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.2); }
          .count { color: #38bdf8; font-size: 26px; }
          img { max-width: 90%; max-height: 60vh; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); object-fit: contain; cursor: pointer; }
        </style>
      </head>
      <body>

        <div class="timer-box">
          অপেক্ষা করুন, রিডাইরেক্ট হচ্ছে... <span class="count" id="timer">3</span> সেকেন্ড
        </div>

        <div>
          <a href="${DIRECT_AD_URL}">
            <img src="${imageUrl}" alt="Content Preview">
          </a>
        </div>

        <script>
          let timeLeft = 3;
          const timerElem = document.getElementById('timer');
          const targetUrl = "${DIRECT_AD_URL}";

          const countdown = setInterval(() => {
            timeLeft--;
            timerElem.innerText = timeLeft;
            if (timeLeft <= 0) {
              clearInterval(countdown);
              window.location.href = targetUrl;
            }
          }, 1000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Invalid or corrupted link!");
  }
});

// হোম পেজ
app.get('/', (req, res) => {
  res.send("Smart Link Telegram Bot Backend is Running Smoothly!");
});

module.exports = app;
