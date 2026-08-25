require('dotenv').config();

const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
const app = createApp();

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`SA Biz Bot listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received; closing server.`);
  server.close((error) => {
    if (error) {
      console.error('Graceful shutdown failed', error);
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
