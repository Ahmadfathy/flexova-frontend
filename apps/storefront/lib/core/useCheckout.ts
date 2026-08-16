"use client";

/**
 * `useCheckout` — the one hook every theme's checkout UI consumes (spec §2
 * data contracts, alongside `useCart`/`useCartRecheck`). Owns the entire
 * §7 flow end to end: reservation + visible TTL, guest-first delivery,
 * shipping zone, payment method, confirm — and every critical state (TTL
 * expiry, payment fail, webhook-late, race-out-at-confirm, idempotency,
 * offline). Themes render this hook's state; they never call
 * checkout-actions.ts directly, same boundary `useCartRecheck` established
 * in S4.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart, cartFromItems } from "./cart";
import {
  startReservationAction,
  reReserveAction,
  matchCustomerAction,
  submitPaymentAction,
  confirmOrderAction,
} from "./checkout-actions";
import {
  reservationSecondsLeft,
  isReservationExpired,
  validateDelivery,
  computeCheckoutTotal,
  generateIdempotencyKey,
  type DeliveryFormInput,
} from "./checkout";
import { readRefCookie } from "./affiliate";
import type { DeliveryInfo, PaymentMethod, Reservation, ShippingZone, OrderConfirmation, CheckoutStep } from "./types";

type ReservationItem = { product_id: string; variant: string | null; qty: number };
type CheckoutError = null | "payment_failed" | "race_out" | "reservation_expired";

export function useCheckout(zones: ShippingZone[]) {
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const removeCartItem = useCart((s) => s.removeItem);

  // `useSearchParams()`, not a manual `window.location.search` read — the
  // checkout page is already `force-dynamic`, and Next resolves search
  // params identically for the server-rendered HTML and the client, so
  // there's no server/client mismatch. A raw `window.location.search` read
  // (the pattern `useCartRecheck` uses, safely, only *inside* a `useEffect`)
  // would disagree between the SSR pass and the client if read during
  // render itself — caught live: `?mock=offline` produced a genuine React
  // hydration-mismatch error until this was switched over.
  const mock = useSearchParams().get("mock");
  const isOffline = mock === "offline";

  const [step, setStep] = useState<CheckoutStep>("delivery");

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [reservingItems, setReservingItems] = useState<ReservationItem[]>([]);
  const [reservationLoading, setReservationLoading] = useState(true);
  const [adjustedNotice, setAdjustedNotice] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [delivery, setDelivery] = useState<DeliveryFormInput>({ phone: "", name: "", address: "" });
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<Record<keyof DeliveryFormInput, string>>>({});
  const [crmMatch, setCrmMatch] = useState<boolean | null>(null);

  const [zoneId, setZoneId] = useState<string>(zones[0]?.id ?? "");
  const zone = useMemo(() => zones.find((z) => z.id === zoneId) ?? zones[0], [zones, zoneId]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<CheckoutError>(null);
  const [blockedItems, setBlockedItems] = useState<{ product_id: string; variant: string | null }[]>([]);
  const [order, setOrder] = useState<OrderConfirmation | null>(null);

  // One key for the whole checkout session — reused across every payment
  // retry so a double-submit (accidental or network-retried) resolves to
  // the same order (spec §7 idempotency).
  const idempotencyKey = useRef(generateIdempotencyKey());

  const subtotal = useMemo(() => cartFromItems(cartItems).subtotal, [cartItems]);
  const total = useMemo(() => computeCheckoutTotal(subtotal, zone?.cost ?? 0), [subtotal, zone]);

  // `useCart`'s `persist` middleware rehydrates from localStorage
  // *asynchronously* — on a fresh `/checkout` page load (not a client-side
  // navigation from an already-hydrated `/cart`), the very first render
  // sees `items: []` for real, a beat before hydration fills it in. Gating
  // the reservation-start effect on `hasHydrated()` (instead of running
  // once unconditionally on mount) is what stops that from reading an
  // empty cart as "no reservation needed" — caught live: a direct
  // `/checkout?mock=...` load never reserved anything until this existed.
  // The check itself has to live in a `useEffect`, never in a `useState`
  // initializer or inline during render — this client component still gets
  // one server-side render pass for the initial HTML (standard Next SSR for
  // "use client" trees), where `persist` isn't safe to touch; effects never
  // run on that pass, only after real browser hydration.
  const [cartHydrated, setCartHydrated] = useState(false);
  useEffect(() => {
    if (useCart.persist.hasHydrated()) {
      setCartHydrated(true);
      return;
    }
    return useCart.persist.onFinishHydration(() => setCartHydrated(true));
  }, []);

  // --- start the reservation the instant checkout is entered (spec §7
  // "start checkout → StockReservation immediately") ---
  useEffect(() => {
    if (!cartHydrated) return;
    if (cartItems.length === 0 || isOffline) {
      setReservationLoading(false);
      return;
    }
    let cancelled = false;
    const requestItems = cartItems.map((it) => ({ product_id: it.product_id, variant: it.variant, qty: it.qty }));
    setReservingItems(requestItems);
    setReservationLoading(true);
    startReservationAction(requestItems, mock).then((resv) => {
      if (cancelled) return;
      setReservation(resv);
      const gotQty = resv.items.reduce((s, i) => s + i.qty, 0);
      const wantQty = requestItems.reduce((s, i) => s + i.qty, 0);
      setAdjustedNotice(gotQty < wantQty);
      setReservationLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Runs once, the first time it sees a hydrated cart — the reservation
    // is sized off the cart as it stood when checkout started; changes
    // after that go through re-reserve (TTL expiry) or resolveRaceOut, not
    // a silent re-run. `cartHydrated` flips false→true at most once, so
    // this still only fires a single time in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated]);

  // --- visible TTL countdown (spec §7 "محجوز لك 10:00") ---
  useEffect(() => {
    if (!reservation || reservation.status !== "active") return;
    setSecondsLeft(reservationSecondsLeft(reservation));
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setReservation((r) => (r && r.status === "active" ? { ...r, status: "expired" } : r));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reservation?.id, reservation?.status]);

  /** "انتهى وقت الحجز" + re-check + re-reserve, keeping every field the
   * shopper already entered (nothing here touches `delivery`/`paymentMethod`). */
  const reReserve = useCallback(async () => {
    if (!reservation) return;
    setReservationLoading(true);
    setError(null);
    const resv = await reReserveAction(reservation.id, reservingItems, mock);
    setReservation(resv);
    setReservationLoading(false);
  }, [reservation, reservingItems, mock]);

  const submitDelivery = useCallback(async () => {
    const errors = validateDelivery(delivery);
    setDeliveryErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const { crm_match } = await matchCustomerAction(delivery.phone.trim());
    setCrmMatch(crm_match);
    setStep("shipping");
  }, [delivery]);

  const confirmCheckout = useCallback(async () => {
    if (isOffline || !reservation) return;
    if (isReservationExpired(reservation)) {
      setError("reservation_expired");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const outcome = await submitPaymentAction(paymentMethod, mock);
      if (outcome === "failed") {
        // Reservation lives out its TTL untouched — same idempotency key,
        // shopper can just retry (spec §7 "retry (idempotent)").
        setError("payment_failed");
        return;
      }

      const deliveryInfo: DeliveryInfo = {
        phone: delivery.phone.trim(),
        name: delivery.name.trim(),
        address: delivery.address.trim(),
        zone: zone?.id,
        shipping_cost: zone?.cost,
        crm_match: crmMatch ?? false,
      };

      const result = await confirmOrderAction({
        idempotencyKey: idempotencyKey.current,
        reservationId: reservation.id,
        delivery: deliveryInfo,
        paymentMethod,
        outcome,
        refCode: readRefCookie(),
        forceRaceOut: mock === "race_out",
      });

      if (!result.ok) {
        setError(result.reason);
        setBlockedItems(result.blockedItems);
        return;
      }

      setOrder(result.order);
      setStep("confirmed");
      clearCart();
    } finally {
      setSubmitting(false);
    }
  }, [isOffline, reservation, paymentMethod, mock, delivery, zone, crmMatch, clearCart]);

  /** "block + alert + adjust" (spec §7 race-out-at-confirm) — drops the
   * items the ERP just said are gone from both the cart and the local
   * reservation request, then re-reserves what's left so the shopper can
   * continue with the remaining items instead of restarting entirely. */
  const resolveRaceOut = useCallback(async () => {
    const remaining = reservingItems.filter(
      (it) => !blockedItems.some((b) => b.product_id === it.product_id && b.variant === it.variant)
    );
    for (const b of blockedItems) removeCartItem(b.product_id, b.variant);
    setReservingItems(remaining);
    setBlockedItems([]);
    setError(null);
    if (reservation) {
      setReservationLoading(true);
      const resv = await reReserveAction(reservation.id, remaining, mock);
      setReservation(resv);
      setReservationLoading(false);
    }
    setStep("review");
  }, [reservingItems, blockedItems, reservation, mock, removeCartItem]);

  return {
    step,
    setStep,
    cartItems,
    cartHydrated,
    subtotal,
    total,
    isOffline,

    reservation,
    reservationLoading,
    secondsLeft,
    adjustedNotice,
    reReserve,

    delivery,
    setDelivery,
    deliveryErrors,
    crmMatch,
    submitDelivery,

    zones,
    zoneId,
    setZoneId,
    zone,

    paymentMethod,
    setPaymentMethod,

    submitting,
    error,
    blockedItems,
    resolveRaceOut,
    order,
    confirmCheckout,
  };
}

export type UseCheckoutReturn = ReturnType<typeof useCheckout>;
