import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function generateUuidFallback() {
  // RFC4122 v4 fallback for contexts where crypto.randomUUID is unavailable.
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

if (!globalThis.crypto?.randomUUID && globalThis.crypto) {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    value: generateUuidFallback,
    configurable: true,
    writable: true,
  });
}

createRoot(document.getElementById("root")!).render(<App />);
