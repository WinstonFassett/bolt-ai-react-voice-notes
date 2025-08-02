import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initSentry } from './sentry';

// Initialize Sentry based on environment and user preferences
// This will be called after the app loads and settings are available

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

// Initialize Sentry after app has loaded and settings store is available
// Small delay to ensure store is hydrated
setTimeout(() => {
  initSentry();
}, 100);