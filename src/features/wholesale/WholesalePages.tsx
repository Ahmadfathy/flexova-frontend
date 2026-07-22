import {
  ClipboardList, PackageCheck, Truck, Route, Users, CreditCard, Boxes, Layers,
} from "lucide-react";
import { WholesalePlaceholderPage } from "./WholesalePlaceholderPage";

// ── Sales orders (FE_13 §4-5) ───────────────────────────────────────
export function OrdersListPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="orders" icon={ClipboardList} />;
}
export function OrderEditorPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="order_new" icon={ClipboardList} />;
}
export function OrderViewPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="order_view" icon={ClipboardList} />;
}
export function OrderPickPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="order_pick" icon={PackageCheck} />;
}

// ── Delivery notes (FE_13 §6) ────────────────────────────────────────
export function DeliveriesListPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="deliveries" icon={Truck} />;
}
export function DeliveryViewPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="delivery_view" icon={Truck} />;
}

// ── Routes (FE_13 §7) ─────────────────────────────────────────────────
export function RoutesListPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="routes" icon={Route} />;
}
export function RouteEditorPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="route_editor" icon={Route} />;
}

// ── Rep monitoring (FE_13 §8) ─────────────────────────────────────────
export function RepsBoardPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="reps" icon={Users} />;
}
export function RepDetailPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="rep_detail" icon={Users} />;
}

// ── Credit control hub (FE_13 §9) ─────────────────────────────────────
export function CreditHubPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="credit" icon={CreditCard} />;
}

// ── Van loads / returns (FE_13 §10) ───────────────────────────────────
export function VanLoadsListPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="van_loads" icon={Boxes} />;
}
export function VanLoadDetailPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="van_load_detail" icon={Boxes} />;
}

// ── Price tiers editor — extends FE_01, standalone /pricing/lists/:id (FE_13 §11) ──
export function PriceTiersEditorPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="price_tiers" icon={Layers} />;
}
