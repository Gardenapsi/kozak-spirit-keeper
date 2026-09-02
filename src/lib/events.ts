import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventItem = Database["public"]["Tables"]["event_items"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type EventStatus = Database["public"]["Enums"]["event_status"];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  planejado: "Planejado",
  ativo: "Em andamento",
  finalizado: "Finalizado",
};

export function formatBRL(value: number | null | undefined) {
  return (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Preço vigente: valor editado no evento ou o preço padrão do produto. */
export function effectivePrice(
  item: { unit_price: number | string | null } | null | undefined,
  productPrice: number | string | null | undefined,
) {
  const override = item?.unit_price;
  if (override !== null && override !== undefined && override !== "") return Number(override);
  return Number(productPrice ?? 0);
}

/* ---------------- leitura ---------------- */

export async function fetchEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchEventItems() {
  const { data, error } = await supabase.from("event_items").select("*");
  if (error) throw error;
  return data;
}

export async function fetchSales(limit = 500) {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/* ---------------- eventos ---------------- */

export type EventInput = {
  name: string;
  location?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
  status?: EventStatus;
  notes?: string | null;
};

export async function createEvent(input: EventInput) {
  const { data, error } = await supabase.from("events").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateEvent(id: string, patch: Partial<EventInput>) {
  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Finaliza o evento: o que não foi vendido volta para o estoque total
 * (a reserva deixa de existir) e fica registrado como devolução.
 */
export async function finalizeEvent(eventId: string, items: EventItem[]) {
  await Promise.all(
    items
      .filter((i) => i.allocated_qty - i.sold_qty - i.returned_qty > 0)
      .map((i) =>
        supabase
          .from("event_items")
          .update({ returned_qty: i.allocated_qty - i.sold_qty })
          .eq("id", i.id),
      ),
  );
  await updateEvent(eventId, { status: "finalizado" });
}

/* ---------------- itens destinados ao evento ---------------- */

/** Quantidade reservada (destinada e ainda não vendida/devolvida) por produto. */
export function reservedByProduct(items: EventItem[], events: Event[]) {
  const open = new Set(events.filter((e) => e.status !== "finalizado").map((e) => e.id));
  const map = new Map<string, { qty: number; byEvent: Map<string, number> }>();
  for (const item of items) {
    if (!open.has(item.event_id)) continue;
    const remaining = item.allocated_qty - item.sold_qty - item.returned_qty;
    if (remaining <= 0) continue;
    const entry = map.get(item.product_id) ?? { qty: 0, byEvent: new Map<string, number>() };
    entry.qty += remaining;
    entry.byEvent.set(item.event_id, (entry.byEvent.get(item.event_id) ?? 0) + remaining);
    map.set(item.product_id, entry);
  }
  return map;
}

/** Estoque livre = estoque total - reservado para eventos abertos. */
export function availableQty(stockQty: number, reserved: number) {
  return Math.max(0, stockQty - reserved);
}

export async function allocateToEvent(input: {
  eventId: string;
  productId: string;
  qty: number;
  unitPrice?: number | null;
  existing?: EventItem | undefined;
}) {
  if (input.existing) {
    const { error } = await supabase
      .from("event_items")
      .update({
        allocated_qty: input.existing.allocated_qty + input.qty,
        ...(input.unitPrice !== undefined ? { unit_price: input.unitPrice } : {}),
      })
      .eq("id", input.existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("event_items").insert({
    event_id: input.eventId,
    product_id: input.productId,
    allocated_qty: input.qty,
    unit_price: input.unitPrice ?? null,
  });
  if (error) throw error;
}

export async function updateEventItem(
  id: string,
  patch: Database["public"]["Tables"]["event_items"]["Update"],
) {
  const { error } = await supabase.from("event_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function removeEventItem(item: EventItem) {
  if (item.sold_qty > 0) {
    // mantém o histórico de vendas: apenas devolve o que sobrou
    await updateEventItem(item.id, { returned_qty: item.allocated_qty - item.sold_qty });
    return;
  }
  const { error } = await supabase.from("event_items").delete().eq("id", item.id);
  if (error) throw error;
}

/* ---------------- venda ---------------- */

export async function registerSale(input: {
  event: Event;
  item: EventItem;
  productName: string;
  quantity: number;
  unitPrice: number;
  productStock: number;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Entre novamente.");

  const remaining = input.item.allocated_qty - input.item.sold_qty - input.item.returned_qty;
  if (input.quantity <= 0) throw new Error("Informe uma quantidade válida.");
  if (input.quantity > remaining)
    throw new Error(`Só há ${remaining} unidade(s) destinada(s) a este evento.`);

  const total = Number((input.quantity * input.unitPrice).toFixed(2));

  const { error: saleError } = await supabase.from("sales").insert({
    event_id: input.event.id,
    event_name: input.event.name,
    product_id: input.item.product_id,
    item_name: input.productName,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    total,
    created_by: userId,
  });
  if (saleError) throw saleError;

  const { error: itemError } = await supabase
    .from("event_items")
    .update({ sold_qty: input.item.sold_qty + input.quantity })
    .eq("id", input.item.id);
  if (itemError) throw itemError;

  const nextStock = Math.max(0, input.productStock - input.quantity);
  const { error: stockError } = await supabase
    .from("products")
    .update({ stock_qty: nextStock })
    .eq("id", input.item.product_id);
  if (stockError) throw stockError;

  const { error: movError } = await supabase.from("movements").insert({
    kind: "saida",
    quantity: input.quantity,
    reason: `Venda · ${input.event.name}`,
    product_id: input.item.product_id,
    item_name: input.productName,
    created_by: userId,
  });
  if (movError) throw movError;
}

/* ---------------- relatórios (admin) ---------------- */

export async function deleteSale(id: string) {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) throw error;
}

/** Apaga todos os registros de vendas (log). Não altera estoques. */
export async function clearSales() {
  const { error } = await supabase.from("sales").delete().not("id", "is", null);
  if (error) throw error;
}
