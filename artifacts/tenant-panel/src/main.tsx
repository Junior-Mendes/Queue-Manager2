import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In dev, proxy API calls to the API server; in production, Replit proxy handles routing
if (import.meta.env.DEV) {
  setBaseUrl("http://localhost:8080");
}

createRoot(document.getElementById("root")!).render(<App />);
