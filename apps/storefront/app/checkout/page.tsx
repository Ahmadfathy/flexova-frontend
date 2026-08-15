import type { Metadata } from "next";

// Placeholder only — the real guest-first, reservation-backed checkout
// flow (spec §7) is Storefront Prompt S5. This just gives the cart's
// "إتمام الشراء" button a real, non-404 target until then.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CheckoutPlaceholderPage() {
  return (
    <main style={{ padding: "4rem 1.5rem", textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>الدفع — قريبًا</h1>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>
        سيتم بناء صفحة الدفع الكاملة (الحجز والتوصيل والدفع) في الخطوة القادمة.
      </p>
      <a href="/cart" style={{ display: "inline-block", marginTop: "1.5rem" }}>العودة للسلة</a>
    </main>
  );
}
