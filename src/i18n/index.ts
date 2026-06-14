import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import arCommon    from "./locales/ar/common.json";
import enCommon    from "./locales/en/common.json";
import arShell     from "./locales/ar/shell.json";
import enShell     from "./locales/en/shell.json";
import arInventory from "./locales/ar/inventory.json";
import enInventory from "./locales/en/inventory.json";
import arSales     from "./locales/ar/sales.json";
import enSales     from "./locales/en/sales.json";
import arPurchasing from "./locales/ar/purchasing.json";
import enPurchasing from "./locales/en/purchasing.json";
import arFinance   from "./locales/ar/finance.json";
import enFinance   from "./locales/en/finance.json";
import arCrm       from "./locales/ar/crm.json";
import enCrm       from "./locales/en/crm.json";
import arHr        from "./locales/ar/hr.json";
import enHr        from "./locales/en/hr.json";
import arReports   from "./locales/ar/reports.json";
import enReports   from "./locales/en/reports.json";
import arAdmin     from "./locales/ar/admin.json";
import enAdmin     from "./locales/en/admin.json";

i18n.use(initReactI18next).init({
  lng: "ar", fallbackLng: "ar",
  ns: ["common", "shell", "inventory", "sales", "purchasing", "finance", "crm", "hr", "reports", "admin"],
  defaultNS: "common",
  resources: {
    ar: {
      common: arCommon, shell: arShell,
      inventory: arInventory, sales: arSales, purchasing: arPurchasing,
      finance: arFinance, crm: arCrm, hr: arHr, reports: arReports, admin: arAdmin,
    },
    en: {
      common: enCommon, shell: enShell,
      inventory: enInventory, sales: enSales, purchasing: enPurchasing,
      finance: enFinance, crm: enCrm, hr: enHr, reports: enReports, admin: enAdmin,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
