import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import arCommon      from "./locales/ar/common.json";
import enCommon      from "./locales/en/common.json";
import arShell       from "./locales/ar/shell.json";
import enShell       from "./locales/en/shell.json";
import arSettings    from "./locales/ar/settings.json";
import enSettings    from "./locales/en/settings.json";
import arInventory   from "./locales/ar/inventory.json";
import enInventory   from "./locales/en/inventory.json";
import arSales       from "./locales/ar/sales.json";
import enSales       from "./locales/en/sales.json";
import arPurchasing  from "./locales/ar/purchasing.json";
import enPurchasing  from "./locales/en/purchasing.json";
import arFinance     from "./locales/ar/finance.json";
import enFinance     from "./locales/en/finance.json";
import arCrm         from "./locales/ar/crm.json";
import enCrm         from "./locales/en/crm.json";
import arHr          from "./locales/ar/hr.json";
import enHr          from "./locales/en/hr.json";
import arReports     from "./locales/ar/reports.json";
import enReports     from "./locales/en/reports.json";
import arAdmin       from "./locales/ar/admin.json";
import enAdmin       from "./locales/en/admin.json";
import arAuth        from "./locales/ar/auth.json";
import enAuth        from "./locales/en/auth.json";
import arErrors      from "./locales/ar/errors.json";
import enErrors      from "./locales/en/errors.json";
import arPatterns    from "./locales/ar/patterns.json";
import enPatterns    from "./locales/en/patterns.json";
import arEta         from "./locales/ar/eta.json";
import enEta         from "./locales/en/eta.json";
import arPos         from "./locales/ar/pos.json";
import enPos         from "./locales/en/pos.json";

i18n.use(initReactI18next).init({
  lng: "ar", fallbackLng: "ar",
  ns: ["common", "shell", "settings", "inventory", "sales", "purchasing", "finance", "crm", "hr", "reports", "admin", "auth", "errors", "patterns", "eta", "pos"],
  defaultNS: "common",
  resources: {
    ar: {
      common: arCommon, shell: arShell, settings: arSettings,
      inventory: arInventory, sales: arSales, purchasing: arPurchasing,
      finance: arFinance, crm: arCrm, hr: arHr, reports: arReports, admin: arAdmin,
      auth: arAuth, errors: arErrors, patterns: arPatterns, eta: arEta, pos: arPos,
    },
    en: {
      common: enCommon, shell: enShell, settings: enSettings,
      inventory: enInventory, sales: enSales, purchasing: enPurchasing,
      finance: enFinance, crm: enCrm, hr: enHr, reports: enReports, admin: enAdmin,
      auth: enAuth, errors: enErrors, patterns: enPatterns, eta: enEta, pos: enPos,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
