# Free Hosting Evaluation for WhatsApp Webhook Testing

**Decision:** Use **Google Cloud Run** for the next live webhook test if Render remains unreliable. It can deploy this existing Node/Express service without a runtime rewrite, gives a public HTTPS endpoint, and uses request-based billing by default, which fits an intermittently used WhatsApp webhook. A Google Cloud billing account is still required even when the request volume is expected to remain within the monthly free tier. [1] [2]

## Options assessed

| Platform | Cost posture | Fit for the current repository | Recommendation |
|---|---|---|---|
| **Google Cloud Run** | The request-based free tier includes 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests per month, aggregated per billing account; excess usage is billed. [1] | **Direct fit.** The service already listens on the platform-provided `PORT`, handles `SIGTERM`, and has a health endpoint. Source deployment builds the Node app automatically. [2] | **Recommended for the live test.** Enable a budget/spend cap and use request-based billing. |
| **Cloudflare Workers** | Free plan includes 100,000 requests/day and 10 ms CPU per invocation. [3] | Possible, but not a drop-in deployment. Cloudflare supports Express with `nodejs_compat`, a Worker adapter, and a Wrangler project. [4] | Good future low-cost option, but **not the fastest path** because it requires a platform adaptation and regression testing. |
| **Koyeb** | Current official pricing lists a `Free 5h` serverless compute option; it is not a continuous, always-on free host. [5] | Node service can run there, but five hours is not suitable for testing Meta callback reliability over time. | **Do not use** for this webhook test. |

## Cloud Run deployment procedure

Before deployment, create or select a Google Cloud project, enable billing, and install and initialize the Google Cloud CLI. Cloud Run’s Node quickstart deploys a source directory with `gcloud run deploy --source .`; Google automatically builds the source into a deployable container. [2]

Use a geographically appropriate region. `africa-south1` (Johannesburg) is available, although it is classified as a Tier 2 region for pricing. For a low-volume test, locality is normally more valuable than the marginal pricing difference; still, set a budget cap before deployment. [1] [2]

```bash
gcloud init
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
cd SA-Biz-Bot-Core
gcloud run deploy sa-biz-bot-core \
  --source . \
  --region africa-south1 \
  --allow-unauthenticated \
  --cpu-throttling \
  --min 0 \
  --max 1
```

After the deployment returns its `https://…run.app` URL, set the production secrets in the Cloud Run service configuration. Required values are `VERIFY_TOKEN`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `META_APP_SECRET`, `GOOGLE_SHEETS_WEBHOOK_URL`, `GOOGLE_SHEETS_WEBHOOK_SECRET`, `KNOWLEDGE_BASE_URL`, and `KNOWLEDGE_BASE_SECRET`. Do not place any of these in a command, repository file, or client-side code.

Set the Meta callback URL to:

```text
https://YOUR_CLOUD_RUN_URL/webhook
```

Then use the exact `VERIFY_TOKEN` value in the Meta webhook configuration and subscribe to the `messages` field. Confirm `https://YOUR_CLOUD_RUN_URL/healthz` returns `200` and `/readyz` returns `200` before using the Meta test-message control.

## Cost controls and limits

Cloud Run request-based billing charges during request processing, startup, and shutdown; it is the default setting and is suited to bursty traffic. A Cloud Billing budget spend cap can pause Cloud Run workloads after the cap is reached, so choose a low alert threshold for testing but avoid a cap so low that it interrupts a Meta verification attempt. [6]

The bot’s in-memory conversation and webhook deduplication cache is intentionally short-lived. Confirmed bookings and knowledge-base content remain in Google Sheets, so a Cloud Run scale-to-zero event will not discard finalized booking data. A user mid-way through a booking may need to restart the flow after an idle shutdown; this is appropriate for test use and should be replaced with a persistent session store in the future multi-tenant product.

## References

[1]: https://cloud.google.com/run/pricing "Google Cloud Run pricing"
[2]: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service "Google Cloud Run — Deploy a Node.js web app"
[3]: https://developers.cloudflare.com/workers/platform/pricing/ "Cloudflare Workers pricing"
[4]: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/ "Cloudflare — Deploy an Express.js application on Workers"
[5]: https://www.koyeb.com/pricing "Koyeb pricing"
[6]: https://docs.cloud.google.com/run/docs/configuring/billing-settings "Cloud Run billing settings"
