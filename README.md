# Fahshabot — Persian Telegram Reply Bot

A Telegram bot designed for Cloudflare Workers. It replies to users who reply to a bot message, normalizes Persian/Arabic character variants for keyword detection, and can notify an admin when a user starts the bot.

## Features

- Replies directly to a user's message using Telegram's `reply_to_message_id`.
- A reply to any bot-authored message triggers a response regardless of the user's text.
- Optional keyword-triggered replies for other messages.
- Persian text normalization for `ی/ي`, `ک/ك`, diacritics, zero-width characters, and half-spaces.
- Optional admin notification on `/start`.
- Optional KV-based suppression of duplicate Telegram updates.
- No credentials are stored in the repository.

## Cloudflare setup

1. Create a Worker and upload `worker.js`.
2. In **Settings → Variables and Secrets**, add:
   - Secret name: `TELEGRAM_BOT_TOKEN`
   - Secret value: the raw token from BotFather only (do not include `bot`, an API URL, or `/setWebhook`).
3. Optional: add `ADMIN_CHAT_ID` as a secret or variable containing the admin's numeric Telegram chat ID.
4. Optional: create a Workers KV namespace and bind it as `FAHASH_DEDUPE` to suppress duplicate update IDs.
5. Configure the Telegram webhook to point to the Worker URL:
   `https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev/`
6. For group messages, adjust BotFather's privacy setting or grant the bot the required permissions, as appropriate.

## Local development

Install Wrangler and use Cloudflare's normal Worker development workflow. Keep secrets in Wrangler secrets or the Cloudflare dashboard; never commit tokens.

## Important notes

- Telegram bot tokens are credentials. Do not commit them or paste them into public issues.
- Keyword matching is a simple dictionary check and can miss variants or produce false positives.
- The optional KV check reduces duplicate processing but is not a fully atomic lock under concurrent requests.
