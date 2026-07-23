import { Truck } from "lucide-react";
import { WholesalePlaceholderPage } from "./WholesalePlaceholderPage";
export { PriceTiersEditorPage } from "./pricing/PriceTiersEditorPage";
export { CreditHubPage } from "./credit/CreditHubPage";
export { OrdersListPage } from "./orders/OrdersListPage";
// Same component serves both /wholesale/orders/new and /wholesale/orders/:id
// (FE_13 §5 — one editor, view becomes read-only once the order leaves "draft").
export { OrderEditorPage, OrderEditorPage as OrderViewPage } from "./orders/OrderEditorPage";
export { OrderPickPage } from "./orders/OrderPickPage";
export { DeliveriesListPage } from "./orders/DeliveriesListPage";
export { RoutesListPage } from "./routes/RoutesListPage";
export { RouteEditorPage } from "./routes/RouteEditorPage";

// ── Delivery notes (FE_13 §6) ────────────────────────────────────────
export function DeliveryViewPage() {
  return <WholesalePlaceholderPage ns="wholesale" titleKey="delivery_view" icon={Truck} />;
}

// ── Rep monitoring (FE_13 §8) ─────────────────────────────────────────
export { RepsBoardPage } from "./reps/RepsBoardPage";
export { RepDetailPage } from "./reps/RepDetailPage";

// ── Van loads / returns (FE_13 §10) ───────────────────────────────────
export { VanLoadsListPage } from "./van-loads/VanLoadsListPage";
export { VanLoadDetailPage } from "./van-loads/VanLoadDetailPage";
