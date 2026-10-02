import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./theme-premium.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { loadBrandPalette, applyBrandPalette } from "./lib/brand-color";
import { loadPageBackground, applyPageBackground } from "./lib/page-background";
import { loadFontScale, applyFontScale } from "./lib/font-scale";
import { loadTheme, applyTheme } from "./lib/theme";
import "./lib/pwa-install";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  const normalized = apiUrl.replace(/\/+$/, "");
  setBaseUrl(normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized);
}

applyBrandPalette(loadBrandPalette());
applyPageBackground(loadPageBackground());
applyFontScale(loadFontScale());
applyTheme(loadTheme());

createRoot(document.getElementById("root")!).render(<App />);
