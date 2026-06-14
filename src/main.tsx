import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { AppearanceProvider } from "@/providers/AppearanceProvider";
import { DirProvider } from "@/providers/DirProvider";
import App from "@/App";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <AppearanceProvider>
        <DirProvider>
          <App />
        </DirProvider>
      </AppearanceProvider>
    </I18nextProvider>
  </StrictMode>
);
