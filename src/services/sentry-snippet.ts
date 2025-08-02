import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://db879c108fd8c3eea4287c2ae1bedf42@o383724.ingest.us.sentry.io/4509776104325120",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true
});

// const container = document.getElementById(“app”);
// const root = createRoot(container);
// root.render(<App />);