import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Supply = Database["public"]["Tables"]["supplies"]["Row"];
export type Movement = Database["public"]["Tables"]["movements"]["Row"];
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
    .order("category")
    .order("volume_ml", { ascending: false })
    .order("name");
  if (error) throw error;
  return data;
}

export async function fetchSupplies() {
  const { data, error } = await supabase.from("supplies").select("*").order("type").order("name");
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

export type MovementInput = {
  kind: MovementKind;
  quantity: number;
  reason?: string | undefined;
  productId?: string | undefined;
  supplyId?: string | undefined;
  itemName: string;
  currentQty: number;
};

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

  return nextQty;
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
