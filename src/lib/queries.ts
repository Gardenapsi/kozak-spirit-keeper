import { queryOptions } from "@tanstack/react-query";

import { fetchEventItems, fetchEvents, fetchSales } from "@/lib/events";
import { fetchMovements, fetchProducts, fetchProductSupplies, fetchSupplies } from "@/lib/inventory";

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: fetchProducts,
});

export const suppliesQuery = queryOptions({
  queryKey: ["supplies"],
  queryFn: fetchSupplies,
});

export const movementsQuery = queryOptions({
  queryKey: ["movements"],
  queryFn: () => fetchMovements(200),
});

export const recipesQuery = queryOptions({
  queryKey: ["product_supplies"],
  queryFn: fetchProductSupplies,
});

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: fetchEvents,
});

export const eventItemsQuery = queryOptions({
  queryKey: ["event_items"],
  queryFn: fetchEventItems,
});

export const salesQuery = queryOptions({
  queryKey: ["sales"],
  queryFn: () => fetchSales(500),
});
