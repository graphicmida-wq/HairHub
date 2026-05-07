import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";
import { loadBrandPalette, applyBrandPalette } from "./lib/brand-color";

const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

applyBrandPalette(loadBrandPalette());

createRoot(document.getElementById("root")!).render(<App />);
