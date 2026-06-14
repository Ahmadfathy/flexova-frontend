import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arCommon from "./locales/ar/common.json";
import enCommon from "./locales/en/common.json";
import arShell from "./locales/ar/shell.json";
import enShell from "./locales/en/shell.json";

i18n.use(initReactI18next).init({
  lng: "ar", fallbackLng: "ar",
  ns: ["common", "shell"], defaultNS: "common",
  resources: {
    ar: { common: arCommon, shell: arShell },
    en: { common: enCommon, shell: enShell },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
