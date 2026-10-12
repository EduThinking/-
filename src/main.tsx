import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./store";
import { SoundProvider } from "./components/SoundProvider";
import "material-symbols/outlined.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./index.css";

// Preview builds (e.g. a sandboxed hosted page) can't rely on server-side SPA routing.
const Router = import.meta.env.VITE_PREVIEW ? MemoryRouter : BrowserRouter;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <StoreProvider>
        <SoundProvider>
          <App />
        </SoundProvider>
      </StoreProvider>
    </Router>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD && !import.meta.env.VITE_PREVIEW) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
