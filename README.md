# SA Biz Bot Core

SA Biz Bot Core is a **WhatsApp Cloud API booking bot** for South African beauty businesses offering salon appointments and house calls. It includes a browser test chat, a multilingual guided booking flow in English, Zulu, and Sesotho, a Meta webhook, optional Google Sheets booking capture, and a Render blueprint.

## What was repaired

The repository previously declared `src/index.js` and several bot features, but contained no `src/` directory, server, webhook handler, simulator, tests, or Render configuration. This version supplies the missing implementation and deployment artefacts.

| Capability | Included behaviour |
|---|---|
| Browser test | Visit `/test` to exercise the same booking flow without Meta credentials. |
| WhatsApp webhook | `GET /webhook` completes Meta’s verification handshake; `POST /webhook` reads inbound Cloud API messages and replies through the Messages API. |
| Booking flow | Captures service, salon versus house call, address when needed, preferred date/time, customer name, and explicit confirmation. |
| Pricing | Default services are configurable with `SERVICES_JSON`; house-call pricing starts at `R80` and can be configured. |
| Security | JSON body limit, optional `x-hub-signature-256` HMAC validation via `META_APP_SECRET`, secrets excluded from Git, and duplicate-message suppression. |
| Durability | Confirmed booking records can be stored in Google Sheets through the included Apps Script receiver. |

## Run locally

1. Install Node.js **20, 21, or 22**. Copy the example environment file and provide only the values you need for local testing.

   ```bash
   cp .env.example .env
   npm install
   npm test
   npm run dev
   ```

2. Open [http://localhost:3000/test](http://localhost:3000/test). Enter `1` for prices or `2` to run the booking flow. Meta credentials are not required for this local simulator.

3. Check service health at [http://localhost:3000/healthz](http://localhost:3000/healthz). The detailed readiness report is at [http://localhost:3000/readyz](http://localhost:3000/readyz); it deliberately lists missing production configuration without displaying secret values.

## Configure a Google Sheet for confirmed bookings

Render’s filesystem is ephemeral, so do not rely on local files to retain booking requests. The included Google Apps Script receiver provides a lightweight durable record.

1. Create a Google Sheet for booking records.
2. Open **Extensions → Apps Script** and replace the default script with [`integrations/google-apps-script/Code.gs`](integrations/google-apps-script/Code.gs).
3. In **Project Settings → Script properties**, create both properties below. `BOOKING_SHEET_ID` is the segment between `/d/` and `/edit` in the Sheet URL. Generate a long random value for `BOOKING_WEBHOOK_SECRET`.

   | Script property | Value |
   |---|---|
   | `BOOKING_SHEET_ID` | The target Google Sheet ID |
   | `BOOKING_WEBHOOK_SECRET` | A long random secret |

4. Deploy as **Web app**. Select **Execute as: Me** and **Who has access: Anyone**. Copy the Web app URL ending in `/exec`.
5. On Render, set `GOOGLE_SHEETS_WEBHOOK_URL` to the `/exec` URL and `GOOGLE_SHEETS_WEBHOOK_SECRET` to the same secret saved in the script properties. Make a test booking through `/test` after deployment and verify a row appears in the `Bookings` tab.

> The Apps Script receiver uses the booking reference as an idempotency key, so a retry cannot create duplicate rows for the same confirmed booking.

## Give each business a modifiable knowledge base

The booking state machine remains fixed and reliable, but all non-booking questions can now be answered from a client-specific knowledge base. This is intentionally **configuration-driven**, not hard-coded: a salon can change its operating hours, address, policies, promotions, product details, and FAQs without a developer changing the bot source.

For the first market-ready version, deploy one bot instance per business and reuse its secure Google Apps Script endpoint for both bookings and knowledge-base reads. In the same Google Sheet, the script automatically creates a `KnowledgeBase` tab with these columns:

| Column | What the business controls |
|---|---|
| `ID` | A stable identifier, such as `hours` or `cancellation-policy`. |
| `Keywords (comma-separated)` | Phrases that should trigger the answer, for example `hours, opening times, open`. |
| `Answer` | The exact customer-facing reply. |
| `Language (all/en/zu/st)` | The language to which the entry applies; `all` is shared. |
| `Enabled (TRUE/FALSE)` | Disable an answer without deleting it. |
| `Priority` | A higher number wins when answers have similar keyword matches. |

Set `KNOWLEDGE_BASE_URL` to the Apps Script `/exec` URL and `KNOWLEDGE_BASE_SECRET` to the same shared secret as the booking receiver. The bot refreshes the remote entries every five minutes by default, so edits take effect without a Render redeploy. For a small demo only, `KNOWLEDGE_BASE_JSON` can hold an inline array of entries; use the Google Sheet for actual client-managed content.

### Customize the conversation wording

Each business can also override the standard booking wording through `BOT_COPY_JSON`, without changing the booking logic. The object is keyed by `en`, `zu`, and `st`, and may override `welcome`, `prices`, `chooseService`, `chooseLocation`, `askAddress`, `askDateTime`, `askName`, `confirm`, `confirmed`, `cancelled`, `help`, `invalidService`, `invalidLocation`, or `loadShedding`. Supported placeholders include `{{businessName}}`, `{{service}}`, `{{appointment}}`, `{{address}}`, `{{preferredDateTime}}`, `{{customerName}}`, `{{price}}`, `{{reference}}`, and `{{loadSheddingMessage}}`.

This creates two clear editing layers: the business can maintain facts and FAQs in the `KnowledgeBase` sheet, while an installer can set branded conversation wording through the deployment configuration. It is intentionally a **single-business deployment model** for now, which keeps each client’s credentials, bookings, and content isolated. A later multi-tenant product should add authenticated client accounts, tenant routing, audit logs, a database, and per-tenant rate limits before sharing one deployment across businesses.

> This version is a **single-business deployment model**. It is the fastest secure path to market because each client’s secrets, booking sheet, and content are isolated. A later multi-tenant product should add authenticated client accounts, tenant routing, audit logs, a database, and per-tenant rate limits before one deployment is shared across businesses.

## Deploy on Render

The repository includes [`render.yaml`](render.yaml), which defines a Node web service, uses `npm ci`, starts with `npm start`, and checks `/healthz`. You can use **New → Blueprint** in Render and connect this repository, or create a Node Web Service manually with the same commands.

| Render setting | Value |
|---|---|
| Build command | `npm ci` |
| Start command | `npm start` |
| Health-check path | `/healthz` |
| Node version | Automatically selected from `package.json` (`>=20 <23`) |
| Port | Do not set a fixed port; Render provides `PORT` automatically. |

Set the following secret environment variables in Render. Never commit them or paste them into GitHub issues.

| Variable | Required | Purpose |
|---|---:|---|
| `VERIFY_TOKEN` | Yes | A long random string used only to verify Meta’s webhook challenge. |
| `WHATSAPP_TOKEN` | Yes | A permanent Meta system-user token with WhatsApp messaging permissions. |
| `PHONE_NUMBER_ID` | Yes | The Cloud API phone number ID, not the visible phone number. |
| `META_APP_SECRET` | Strongly recommended | Verifies that webhook requests were signed by Meta. |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Yes for production bookings | Apps Script web-app URL ending in `/exec`. |
| `GOOGLE_SHEETS_WEBHOOK_SECRET` | Yes for production bookings | Shared secret that authorizes the Apps Script receiver. |
| `KNOWLEDGE_BASE_URL` | Yes for client-managed answers | Use the same Apps Script `/exec` URL as the booking receiver. |
| `KNOWLEDGE_BASE_SECRET` | Yes for client-managed answers | Same secret used by the Apps Script receiver. |
| `KNOWLEDGE_BASE_CACHE_TTL_SECONDS` | Optional | Refresh interval; defaults to `300` seconds. |
| `OWNER_WHATSAPP` | Optional | E.164-style owner number without `+`, for a best-effort owner alert. |
| `BUSINESS_NAME` | Optional | Name shown in bot replies; defaults to `Glam by Thandi`. |
| `SERVICES_JSON` | Optional | Replaces the default service menu. |
| `REQUIRE_CONSENT` | Recommended; defaults to `true` | Requires opt-in before a booking session stores the customer number in memory or writes a booking. |
| `PRIVACY_NOTICE` | Optional | The business-specific consent request shown before booking. |
| `BOT_COPY_JSON` | Optional | Per-language overrides for booking prompts and confirmation templates. |

## Connect Meta WhatsApp Cloud API

After the Render deploy is live, use the public HTTPS URL shown by Render. In the Meta App Dashboard, configure the webhook callback URL as:

```text
https://YOUR-RENDER-SERVICE.onrender.com/webhook
```

Enter the exact same `VERIFY_TOKEN` value that is stored in Render. Subscribe the WhatsApp **messages** field. Then send a message from a test WhatsApp number to the Cloud API phone number. The bot replies through the Messages API using `POST /{PHONE_NUMBER_ID}/messages`.

The user must start the conversation for the bot’s free-form response to be allowed. Sending a free-form message after the customer-service window closes requires an approved Meta message template. Owner alerts are best effort; Google Sheets is the durable booking system of record.

## Operational checks before launch

Run each check below after configuration. Do not advertise the bot until all items pass.

1. `GET /healthz` returns `200`.
2. `GET /readyz` returns `200` and has no unexpected warnings.
3. Meta accepts the webhook callback verification.
4. A real WhatsApp test number receives a price-list reply after sending `1`.
5. A complete booking creates exactly one Google Sheets row.
6. A repeated Meta delivery of the same message ID does not create duplicate outbound replies during the service lifetime; the Google Sheet also deduplicates confirmed booking references.

## API routes

| Route | Method | Intended use |
|---|---|---|
| `/healthz` | `GET` | Render liveness check. |
| `/readyz` | `GET` | Configuration status without exposing secret values. |
| `/webhook` | `GET` | Meta webhook verification. |
| `/webhook` | `POST` | Inbound WhatsApp messages and status events. |
| `/test` | `GET` | Browser simulator. |
| `/api/test-message` | `POST` | Simulator backend endpoint. |

## Project layout

```text
src/
  app.js                 Express application and Meta webhook routes
  index.js               Render-compatible server entry point
  bot/bookingBot.js      Guided multilingual booking flow
  bot/config.js          Configurable services and business settings
  bookingStore.js        Google Sheets capture and owner alerts
  whatsapp/client.js     WhatsApp Cloud API client
public/index.html        Browser chat simulator
integrations/google-apps-script/Code.gs
render.yaml              Render Blueprint
```

## References

Meta’s current documentation explains the WhatsApp webhook payload and its retry behaviour, as well as the Messages API endpoint and customer-service window rules. Render documents the Node/Express build and start configuration. [1] [2] [3]

[1]: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview "Meta — WhatsApp Business Platform Webhooks"
[2]: https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages "Meta — WhatsApp Service Messages"
[3]: https://render.com/docs/deploy-node-express-app "Render — Deploy a Node Express App"
