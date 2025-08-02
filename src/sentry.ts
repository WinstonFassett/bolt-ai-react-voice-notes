import * as Sentry from "@sentry/react";
import { useSettingsStore } from "./stores/settingsStore";

// Initialize Sentry based on environment and user preference
export function initSentry() {
  // Only initialize in production
  if (!import.meta.env.SENTRY_DSN) {
    console.log('Sentry disabled in development environment');
    return;
  }
  
  // Check if user has opted in
  const errorReportingEnabled = useSettingsStore.getState().errorReportingEnabled;
  
  if (!errorReportingEnabled) {
    console.log('Sentry disabled: user has not opted in');
    return;
  }
  
  console.log('Initializing Sentry: user has opted in');
  
  Sentry.init({
    dsn: "https://db879c108fd8c3eea4287c2ae1bedf42@o383724.ingest.us.sentry.io/4509776104325120",
    // Explicitly disable PII collection
    sendDefaultPii: false,
    
    // Minimal data collection
    beforeSend(event) {
      // Strip any potential PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
        delete event.user.username;
        delete event.user.id;
      }
      
      // Only send technical error info
      return event;
    }
  });
}

// const container = document.getElementById(“app”);
// const root = createRoot(container);
// root.render(<App />);