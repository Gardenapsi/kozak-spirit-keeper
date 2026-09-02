import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Supply = Database["public"]["Tables"]["supplies"]["Row"];
export type Movement = Database["public"]["Tables"]["movements"]["Row"];
export type ProductSupply = Database["public"]["Tables"]["product_supplies"]["Row"];
export type ProductCategory = Database["public"]["Enums"]["product_category"];
export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type SupplyType = Database["public"]["Enums"]["supply_type"];
export type MovementKind = Database["public"]["Enums"]["movement_kind"];

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  cachaca: "Cachaça",
  licor: "Licor",
  vodka: "Vodka",
  edicao_limitada: "Edição Limitada",
};

export const STATUS_LABEL: Record<ProductStatus, string> = {
  ativo: "Ativo",
  em_breve: "Em breve",
  descontinuado: "Descontinuado",
};

export const SUPPLY_LABEL: Record<SupplyType, string> = {
  garrafa: "Garrafa",
  tampa: "Tampa",
  rotulo: "Rótulo",
  copo: "Copo",
  caixa_madeira: "Caixa de madeira",
  outro: "Outro",
};

export const KIND_LABEL: Record<MovementKind, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchSupplies() {
  const { data, error } = await supabase
    .from("supplies")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchMovements(limit = 200) {
  const { data, error } = await supabase
    .from("movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchProductSupplies() {
  const { data, error } = await supabase.from("product_supplies").select("*");
  if (error) throw error;
  return data;
}

/* ---------------- edição / exclusão ---------------- */

export async function updateProduct(id: string, patch: Database["public"]["Tables"]["products"]["Update"]) {
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function updateSupply(id: string, patch: Database["public"]["Tables"]["supplies"]["Update"]) {
  const { error } = await supabase.from("supplies").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSupply(id: string) {
  const { error } = await supabase.from("supplies").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- ordem visual ---------------- */

export async function swapOrder(
  table: "products" | "supplies",
  a: { id: string; sort_order: number },
  b: { id: string; sort_order: number },
) {
  const results = await Promise.all([
    supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

export async function normalizeOrder(table: "products" | "supplies", ids: string[]) {
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from(table)
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/* ---------------- receita (insumos por produto) ---------------- */

export type RecipeItem = { supplyId: string; qty: number };

export async function saveRecipe(productId: string, items: RecipeItem[]) {
  const { data: current, error: readError } = await supabase
    .from("product_supplies")
    .select("id, supply_id")
    .eq("product_id", productId);
  if (readError) throw readError;

  const keep = new Set(items.map((i) => i.supplyId));
  const toDelete = (current ?? []).filter((row) => !keep.has(row.supply_id)).map((row) => row.id);

  if (toDelete.length > 0) {
    const { error } = await supabase.from("product_supplies").delete().in("id", toDelete);
    if (error) throw error;
  }

  if (items.length > 0) {
    const { error } = await supabase.from("product_supplies").upsert(
      items.map((i) => ({
        product_id: productId,
        supply_id: i.supplyId,
        qty_per_unit: i.qty,
      })),
      { onConflict: "product_id,supply_id" },
    );
    if (error) throw error;
  }
}

/* ---------------- movimentações ---------------- */

export type MovementInput = {
  kind: MovementKind;
  quantity: number;
  reason?: string | undefined;
  productId?: string | undefined;
  supplyId?: string | undefined;
  itemName: string;
  currentQty: number;
};

export type SupplyNeed = {
  supplyId: string;
  name: string;
  unit: string;
  needed: number;
  available: number;
};

export type SupplyCheck = {
  ok: boolean;
  hasRecipe: boolean;
  needs: SupplyNeed[];
  missing: SupplyNeed[];
};

/** Verifica se há insumos suficientes para produzir `qty` unidades do produto. */
export async function checkSuppliesForProduction(
  productId: string,
  qty: number,
): Promise<SupplyCheck> {
  const { data, error } = await supabase
    .from("product_supplies")
    .select("supply_id, qty_per_unit, supplies(id, name, unit, stock_qty)")
    .eq("product_id", productId);
  if (error) throw error;

  const needs: SupplyNeed[] = [];
  for (const row of data ?? []) {
    const supply = row.supplies as unknown as {
      id: string;
      name: string;
      unit: string;
      stock_qty: number;
    } | null;
    if (!supply) continue;
    const per = Number(row.qty_per_unit) > 0 ? Number(row.qty_per_unit) : 1;
    needs.push({
      supplyId: supply.id,
      name: supply.name,
      unit: supply.unit,
      needed: Math.ceil(per * qty),
      available: supply.stock_qty,
    });
  }

  const missing = needs.filter((n) => n.available < n.needed);
  return { ok: missing.length === 0, hasRecipe: needs.length > 0, needs, missing };
}

export function missingSuppliesMessage(missing: SupplyNeed[]) {
  const list = missing
    .map((m) => `${m.name} (precisa ${m.needed} ${m.unit}, tem ${m.available})`)
    .join("; ");
  return `Produção bloqueada: insumos insuficientes — ${list}.`;
}

export async function registerMovement(input: MovementInput) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  const delta =
    input.kind === "entrada"
      ? input.quantity
      : input.kind === "saida"
        ? -input.quantity
        : input.quantity - input.currentQty;
  const nextQty = Math.max(0, input.currentQty + delta);

  // Entrada/produção de produto só é permitida com os insumos da receita disponíveis.
  let consume: SupplyNeed[] = [];
  if (input.productId && delta > 0) {
    const check = await checkSuppliesForProduction(input.productId, delta);
    if (!check.hasRecipe) {
      throw new Error(
        "Nenhum insumo vinculado a este produto. Cadastre a receita (garrafa, tampa, rótulo…) antes de dar entrada em estoque.",
      );
    }
    if (!check.ok) throw new Error(missingSuppliesMessage(check.missing));
    consume = check.needs;
  }

  const { error: movError } = await supabase.from("movements").insert({
    kind: input.kind,
    quantity: input.kind === "ajuste" ? delta : input.quantity,
    reason: input.reason ?? null,
    product_id: input.productId ?? null,
    supply_id: input.supplyId ?? null,
    item_name: input.itemName,
    created_by: userId,
  });
  if (movError) throw movError;

  if (input.productId) {
    const { error } = await supabase
      .from("products")
      .update({ stock_qty: nextQty })
      .eq("id", input.productId);
    if (error) throw error;
  } else if (input.supplyId) {
    const { error } = await supabase
      .from("supplies")
      .update({ stock_qty: nextQty })
      .eq("id", input.supplyId);
    if (error) throw error;
  }

  // Baixa os insumos consumidos na produção e registra as saídas.
  for (const need of consume) {
    const next = Math.max(0, need.available - need.needed);
    const { error } = await supabase
      .from("supplies")
      .update({ stock_qty: next })
      .eq("id", need.supplyId);
    if (error) throw error;
    await supabase.from("movements").insert({
      kind: "saida",
      quantity: need.needed,
      reason: `Produção de ${input.itemName}`,
      supply_id: need.supplyId,
      item_name: need.name,
      created_by: userId,
    });
  }

  return nextQty;
}

/* ---------------- histórico (admin) ---------------- */

export async function deleteMovement(id: string) {
  const { error } = await supabase.from("movements").delete().eq("id", id);
  if (error) throw error;
}

export async function clearMovements() {
  const { error } = await supabase.from("movements").delete().not("id", "is", null);
  if (error) throw error;
}


/** Quantas unidades do produto os insumos da receita permitem engarrafar. */
export function bottlesPossible(
  recipe: { supply_id: string; qty_per_unit: number }[],
  supplies: Supply[],
) {
  if (recipe.length === 0) return null;
  const byId = new Map(supplies.map((s) => [s.id, s]));
  let min = Infinity;
  for (const item of recipe) {
    const supply = byId.get(item.supply_id);
    if (!supply) continue;
    const per = item.qty_per_unit > 0 ? item.qty_per_unit : 1;
    min = Math.min(min, Math.floor(supply.stock_qty / per));
  }
  return Number.isFinite(min) ? min : null;
}

export function stockLevel(qty: number, min: number): "critico" | "baixo" | "ok" {
  if (qty <= 0) return "critico";
  if (qty <= min) return "baixo";
  return "ok";
}

export function monthsUntil(date: string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Apaga o relatório completo: vendas + movimentações. Não altera estoques. */
export async function clearReports() {
  const { clearSales } = await import("@/lib/events");
  await clearSales();
  await clearMovements();
}
