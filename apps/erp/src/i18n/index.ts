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
import arFnb         from "./locales/ar/fnb.json";
import enFnb         from "./locales/en/fnb.json";
import arSvc         from "./locales/ar/svc.json";
import enSvc         from "./locales/en/svc.json";
import arRepair      from "./locales/ar/repair.json";
import enRepair      from "./locales/en/repair.json";
import arWholesale   from "./locales/ar/wholesale.json";
import enWholesale   from "./locales/en/wholesale.json";
import arVan         from "./locales/ar/van.json";
import enVan         from "./locales/en/van.json";
import arMfg         from "./locales/ar/mfg.json";
import enMfg         from "./locales/en/mfg.json";
import arPlay        from "./locales/ar/play.json";
import enPlay        from "./locales/en/play.json";
import arProjects    from "./locales/ar/projects.json";
import enProjects    from "./locales/en/projects.json";
import arConstruction from "./locales/ar/construction.json";
import enConstruction from "./locales/en/construction.json";
import arHealthcare   from "./locales/ar/healthcare.json";
import enHealthcare   from "./locales/en/healthcare.json";
import arEcommerce    from "./locales/ar/ecommerce.json";
import enEcommerce    from "./locales/en/ecommerce.json";

i18n.use(initReactI18next).init({
  lng: "ar", fallbackLng: "ar",
  ns: ["common", "shell", "settings", "inventory", "sales", "purchasing", "finance", "crm", "hr", "reports", "admin", "auth", "errors", "patterns", "eta", "pos", "fnb", "svc", "repair", "wholesale", "van", "mfg", "play", "projects", "construction", "healthcare", "ecommerce"],
  defaultNS: "common",
  resources: {
    ar: {
      common: arCommon, shell: arShell, settings: arSettings,
      inventory: arInventory, sales: arSales, purchasing: arPurchasing,
      finance: arFinance, crm: arCrm, hr: arHr, reports: arReports, admin: arAdmin,
      auth: arAuth, errors: arErrors, patterns: arPatterns, eta: arEta, pos: arPos, fnb: arFnb, svc: arSvc, repair: arRepair,
      wholesale: arWholesale, van: arVan, mfg: arMfg, play: arPlay, projects: arProjects, construction: arConstruction,
      healthcare: arHealthcare, ecommerce: arEcommerce,
    },
    en: {
      common: enCommon, shell: enShell, settings: enSettings,
      inventory: enInventory, sales: enSales, purchasing: enPurchasing,
      finance: enFinance, crm: enCrm, hr: enHr, reports: enReports, admin: enAdmin,
      auth: enAuth, errors: enErrors, patterns: enPatterns, eta: enEta, pos: enPos, fnb: enFnb, svc: enSvc, repair: enRepair,
      wholesale: enWholesale, van: enVan, mfg: enMfg, play: enPlay, projects: enProjects, construction: enConstruction,
      healthcare: enHealthcare, ecommerce: enEcommerce,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
