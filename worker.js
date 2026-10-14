/**
 * Fahshabot — Telegram reply bot on Cloudflare Workers
 *
 * Required Worker secret:
 *   TELEGRAM_BOT_TOKEN
 * Optional secret:
 *   ADMIN_CHAT_ID
 * Optional KV binding:
 *   FAHASH_DEDUPE (recommended for duplicate-update suppression)
 *
 * Set Telegram webhook to https://<worker-name>.<subdomain>.workers.dev/
 */

const RUDE = [
  "کسشر نگو؛ این حجم از مزخرف‌گویی واقعاً شاهکاره.",
  "کس‌کش، قبل از حرف زدن یه لحظه فکر کن.",
  "چه جنده‌بازی‌ای راه انداختی؛ جمعش کن.",
  "کونی‌بازی درنیار و یه حرف حساب بزن.",
  "اوب، این دیگه چه چرندی بود؟",
  "گوه نخور؛ هرچی می‌گی از قبلی بی‌ربط‌تره.",
  "کسشر محض گفتی؛ دوباره فکر کن بعد تایپ کن.",
  "زر مفت نزن؛ این بحث رو با این مزخرفات خراب نکن.",
  "این همه چرت‌وپرت تحویل نده، اعصاب آدم رو خرد می‌کنی.",
  "چه گندی زدی به حرف؛ یه بار درست فکر کن.",
  "حرف نزن که هر بار یه مشت کسشر تحویل می‌دی.",
  "این چه مزخرفیه؟ مغزت رو روشن کن بعد پیام بده.",
  "آشغال تحویل نده؛ یه ذره منطقی باش.",
  "گندش رو درآوردی؛ جمع کن این چرت‌وپرت رو.",
  "این‌قدر زر نزن؛ حرف حساب هم بلدی؟",
  "کس‌کش، این یکی رو دیگه از کجات درآوردی؟"
];

const WORDS = [
  "کسخل", "کصخل", "کس خول", "کص خول", "کونی", "کیر", "کص", "کوس",
  "کثافت", "جنده", "حرومزاده", "حرامزاده", "گوه", "خفه شو", "عوضی",
  "بی شعور", "بیشعور", "احمق", "پفیوز", "اسکل", "گمشو", "زر نزن",
  "ریدی", "ریدم", "ریدن", "کیرم", "کیرتو", "کصکش", "کسکش", "لاشخور",
  "گاو", "خر", "آشغال", "دله", "چس نگو", "چرت نگو", "خفه", "گوه خور",
  "گوهخوری", "لاش", "کسشر", "کس‌شر", "کس کش", "اوب"
];

function norm(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200B-\u200F\uFEFF]/g, "")
    .replace(/[\u200C]/g, " ")
    .replace(/[.,!?،؛:()[\]{}"'«»ـ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasProfanity(text = "") {
  const normalized = norm(text);
  return WORDS.some((word) => normalized.includes(norm(word)));
}

function pickReply() {
  return RUDE[Math.floor(Math.random() * RUDE.length)];
}

async function telegram(env, method, payload) {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    console.error("Telegram API error", method, result);
  }
  return result;
}

async function sendReply(env, message, text) {
  return telegram(env, "sendMessage", {
    chat_id: message.chat.id,
    text,
    reply_to_message_id: message.message_id,
    allow_sending_without_reply: true
  });
}

async function notifyAdmin(env, message) {
  if (!env.ADMIN_CHAT_ID || !message.from) return;
  const user = message.from;
  const username = user.username ? `@${user.username}` : "(بدون یوزرنیم)";
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
  await telegram(env, "sendMessage", {
    chat_id: env.ADMIN_CHAT_ID,
    text: `کاربر جدید بات را شروع کرد\nنام: ${name || "نامشخص"}\nیوزرنیم: ${username}\nشناسه: ${user.id}`
  });
}

async function handleUpdate(update, env) {
  const message = update.message || update.edited_message;
  if (!message || !message.chat || !message.from || message.from.is_bot) return;

  const text = message.text || message.caption || "";
  const command = text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();

  if (command === "/start") {
    await sendReply(env, message, "فحشابـات فعاله 😈\nبرای جواب گرفتن، به یکی از پیام‌های من ریپلای کن.");
    await notifyAdmin(env, message);
    return;
  }

  if (command === "/help") {
    await sendReply(env, message, "برای دریافت جواب، به پیام خود بات ریپلای کن. بات به همان پیام ریپلای می‌کند.");
    return;
  }

  // Replying to a bot message always triggers a response, regardless of message text.
  const replyingToBot = Boolean(message.reply_to_message?.from?.is_bot);
  if (replyingToBot) {
    await sendReply(env, message, pickReply());
    return;
  }

  // For other messages, only messages containing dictionary terms may trigger a response.
  if (text && hasProfanity(text) && Math.random() < 0.45) {
    await sendReply(env, message, pickReply());
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "GET") {
      return new Response("Fahshabot is running", { status: 200 });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    if (!env.TELEGRAM_BOT_TOKEN) {
      console.error("Missing TELEGRAM_BOT_TOKEN secret");
      return new Response("Worker secret is not configured", { status: 500 });
    }

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400 });
    }

    // Optional KV binding prevents most Telegram retries from being processed twice.
    if (update.update_id !== undefined && env.FAHASH_DEDUPE) {
      const key = `update:${update.update_id}`;
      try {
        if (await env.FAHASH_DEDUPE.get(key)) return new Response("OK");
        await env.FAHASH_DEDUPE.put(key, "1", { expirationTtl: 86400 });
      } catch (error) {
        console.error("Dedupe KV error", error);
      }
    }

    try {
      await handleUpdate(update, env);
    } catch (error) {
      console.error("Update handler error", error);
    }
    return new Response("OK");
  }
};
