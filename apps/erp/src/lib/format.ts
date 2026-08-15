const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const formatNumber = (n: number) => nf.format(n);

export const formatMoney = (n: number, lang: "ar" | "en" = "ar") =>
  lang === "ar" ? `${nf.format(n)} ج.م` : `EGP ${nf.format(n)}`;

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

export const formatTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d));
