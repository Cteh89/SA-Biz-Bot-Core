# SA Biz Bot Package Readiness

## Current implementation

The bot now supports per-business FAQ content through the editable Google Sheets `KnowledgeBase` tab or `KNOWLEDGE_BASE_JSON`. It also supports per-language conversation-copy overrides through `BOT_COPY_JSON`, configurable services and prices through `SERVICES_JSON`, English/isiZulu/Sesotho response flows, salon and house-call booking, load-shedding copy, Google Sheets booking capture, owner WhatsApp alerts for confirmed bookings, Meta webhook verification, duplicate-message protection, and a default opt-in consent gate before booking.

## Package comparison

| Package promise | Current status | Notes |
|---|---|---|
| Starter FAQs: price, hours, location, load-shedding | Partial | Prices and load-shedding are configurable. Hours and location should be added as client KnowledgeBase rows; the current seed contains a location example but no business-specific hours. A Soweto map pin can be stored as a KnowledgeBase answer/link. |
| Starter English + isiZulu/Sesotho | Implemented | `en`, `zu`, and `st` flows are present. |
| Starter captures name and what the customer needs while busy | Partial | Names are captured during bookings. There is no separate lead-capture path for general enquiries, and owner alerts currently fire for confirmed bookings rather than every lead. |
| Starter WhatsApp, Facebook Page, Instagram DMs | Partial | WhatsApp Cloud API is implemented. Facebook Messenger and Instagram Direct clients are not implemented. |
| Growth booking/quotes/orders | Partial | Appointment booking is implemented. Quotes and orders are not. |
| Growth Google Calendar or Sheets | Partial | Google Sheets booking capture is implemented. Google Calendar sync is not. |
| Growth automated reminders | Missing | No scheduler, reminder templates, or reminder delivery worker exists. |
| Growth Yoco/PayFast/Ozow links | Missing | No payment-provider integration exists. |
| Growth daily summary | Missing | No chat/booking metrics store or summary job exists. |
| Pro autonomous follow-up | Missing | No delayed follow-up scheduler or opt-out workflow exists. |
| Pro invoices/quotes | Missing | No document generation or numbering system exists. |
| Pro re-engagement | Missing | No customer history, consented marketing list, or re-engagement scheduler exists. |
| Pro POPIA consent | Foundation implemented | Booking consent is required by default and can be customized. Full POPIA readiness still needs retention rules, deletion/export controls, audit logging, and a reviewed privacy notice. |

## Commits

The latest local commit is `76277ab Add business templates and consent safeguards`. It includes `BOT_COPY_JSON`, the default booking consent gate, `PRIVACY_NOTICE`, Render blueprint variables, documentation, and tests. The prior published commits are `32e694d` and `7caa691`.

## Recommended build order

Finish Starter lead capture and business template onboarding first. Then add Growth reminders and one payment provider, preferably behind a provider interface. Add calendar sync and daily summaries next. Build Pro follow-up, customer history, invoices, and re-engagement only after consent, retention, opt-out, and audit behavior are designed.
