import type { SvcPackage } from "@/stores/svcPackages";

/**
 * Active package covering exactly the chosen service, for a given client — packages are
 * single-service (one `service_id`), so coverage is only offered for a single-service booking.
 */
export function findCoveragePackage(
  packages: Record<string, SvcPackage>,
  clientId: string,
  serviceIds: string[]
): SvcPackage | undefined {
  if (!clientId || serviceIds.length !== 1) return undefined;
  const [serviceId] = serviceIds;
  return Object.values(packages).find(
    (p) => p.client_id === clientId && p.service_id === serviceId && p.status === "active" && p.remaining > 0
  );
}
