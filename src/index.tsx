import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initializeDebugTools } from "./utils/debugInitializer";

// Initialize debug tools for development
initializeDebugTools();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);