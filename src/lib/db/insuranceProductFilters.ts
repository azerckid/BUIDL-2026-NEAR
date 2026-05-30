import { and, eq, isNotNull } from "drizzle-orm";

import { insuranceProducts } from "@/lib/db/schema";

export function activeSourceBackedProductFilter() {
  return and(
    eq(insuranceProducts.isActive, 1),
    eq(insuranceProducts.catalogStatus, "approved"),
    isNotNull(insuranceProducts.productSourceId)
  );
}
