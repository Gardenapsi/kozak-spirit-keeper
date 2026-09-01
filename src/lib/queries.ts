import { queryOptions } from "@tanstack/react-query";

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
