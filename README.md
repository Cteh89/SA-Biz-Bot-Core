# SA-Biz-Bot-Core - Glam by Thandi Edition (Beauty + House Calls)

This is your white-label core for SA solo businesses. Built for Option A: Beauty salon with house calls.

## What this does for a salon owner
- Answers WhatsApp 24/7 in English / Zulu / Sesotho
- Price list from Google Sheets (no code to update prices)
- Books salon OR house call (+R80-R150 auto added)
- Handles load-shedding auto-replies
- Sends booking to owner's WhatsApp + Google Sheet

## Quick Start (No WhatsApp API needed to test)

```bash
npm install
npm run dev
# Open http://localhost:3000/test - chat with the bot like WhatsApp
```

## When you get WhatsApp Cloud API (free from Meta)
1. Create .env from .env.example
2. Paste your WHATSAPP_TOKEN and PHONE_NUMBER_ID
3. Set webhook: https://yourdomain.com/webhook
4. Done - same bot now runs on real WhatsApp

## Repo Structure
/src/bot/templates/beauty_salon.json - All services, prices, house call logic
/src/bot/languages - zu, st, en
/src/whatsapp - Cloud API webhook
/test-ui - Browser WhatsApp simulator to demo to clients

## How you sell it
Show client /test - they see THEIR salon name answering. Close.

Owner: Cteh89 | Target: Soweto beauty salons first
