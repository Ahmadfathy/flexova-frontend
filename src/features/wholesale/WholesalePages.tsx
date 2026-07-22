import {
  Truck, Route, Users, Boxes,
} from "lucide-react";
import { WholesalePlaceholderPage } from "./WholesalePlaceholderPage";
export { PriceTiersEditorPage } from "./pricing/PriceTiersEditorPage";
export { CreditHubPage } from "./credit/CreditHubPage";
export { OrdersListPage } from "./orders/OrdersListPage";
// Same component serves both /wholesale/orders/new and /wholesale/orders/:id
// (FE_13 §5 — one editor, view becomes read-only once the order leaves "draft").
export { OrderEditorPage, OrderEditorPage as OrderViewPage } from "./orders/OrderEditorPage";
export { OrderPickPage } from "./orders/OrderPickPage";
export { DeliveriesListPage } from "./orders/DeliveriesListPage";

// ── Delivery notes (FE_13 §6) ────────────────────────────────────────
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

// ── Van loads / returns (FE_13 §10) ───────────────────────────────────
export function VanLoadsListPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="van_loads" icon={Boxes} />;
}
export function VanLoadDetailPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="van_load_detail" icon={Boxes} />;
}
