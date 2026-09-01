import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  allocateToEvent,
  availableQty,
  effectivePrice,
  EVENT_STATUS_LABEL,
  finalizeEvent,
  formatBRL,
  registerSale,
  removeEventItem,
  reservedByProduct,
  updateEvent,
  updateEventItem,
  type EventItem,
  type EventStatus,
} from "@/lib/events";
import type { Product } from "@/lib/inventory";
import { eventItemsQuery, eventsQuery, productsQuery, salesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/eventos/$eventId")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(eventsQuery);
    void context.queryClient.prefetchQuery(eventItemsQuery);
    void context.queryClient.prefetchQuery(productsQuery);
    void context.queryClient.prefetchQuery(salesQuery);
  },
  head: () => ({
    meta: [
      { title: "Evento | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Estoque destinado ao evento, preço por feira, registro de vendas e faturamento do dia.",
      },
      { property: "og:title", content: "Evento | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Separe garrafas para a feira, venda e acompanhe o faturamento em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventoDetalhe,
});

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["event_items"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["movements"] });
  };
}

function EventoDetalhe() {
  const { eventId } = Route.useParams();
  const invalidate = useInvalidateAll();
  const { data: events } = useQuery(eventsQuery);
  const { data: items } = useQuery(eventItemsQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: sales } = useQuery(salesQuery);

  const [allocOpen, setAllocOpen] = useState(false);
  const [allocForm, setAllocForm] = useState({ productId: "", qty: "1", price: "" });
  const [selling, setSelling] = useState<EventItem | null>(null);
  const [sellQty, setSellQty] = useState("1");
  const [sellPrice, setSellPrice] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  const event = (events ?? []).find((e) => e.id === eventId);
  const eventItems = useMemo(
    () => (items ?? []).filter((i) => i.event_id === eventId),
    [items, eventId],
  );
  const productById = useMemo(
    () => new Map((products ?? []).map((p) => [p.id, p])),
    [products],
  );
  const reserved = useMemo(
    () => reservedByProduct(items ?? [], events ?? []),
    [items, events],
  );

  const eventSales = useMemo(
    () => (sales ?? []).filter((s) => s.event_id === eventId),
    [sales, eventId],
  );

  const totals = useMemo(() => {
    let reservedQty = 0;
    let stockValue = 0;
    for (const item of eventItems) {
      const product = productById.get(item.product_id);
      const remaining = Math.max(0, item.allocated_qty - item.sold_qty - item.returned_qty);
      reservedQty += remaining;
      stockValue += remaining * effectivePrice(item, product?.price ?? 0);
    }
    const sold = eventSales.reduce((acc, s) => acc + s.quantity, 0);
    const revenue = eventSales.reduce((acc, s) => acc + Number(s.total), 0);
    return { reservedQty, stockValue, sold, revenue };
  }, [eventItems, productById, eventSales]);

  const allocatable = (products ?? []).filter((p) => {
    const r = reserved.get(p.id)?.qty ?? 0;
    return availableQty(p.stock_qty, r) > 0;
  });

  const finished = event?.status === "finalizado";

  const allocMutation = useMutation({
    mutationFn: async () => {
      const product = productById.get(allocForm.productId);
      if (!product) throw new Error("Selecione um produto.");
      const qty = Math.round(Number(allocForm.qty));
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Informe uma quantidade válida.");
      const free = availableQty(product.stock_qty, reserved.get(product.id)?.qty ?? 0);
      if (qty > free) throw new Error(`Estoque livre insuficiente: ${free} unidade(s).`);
      const existing = eventItems.find((i) => i.product_id === product.id);
      await allocateToEvent({
        eventId,
        productId: product.id,
        qty,
        unitPrice: allocForm.price ? Number(allocForm.price) : (existing?.unit_price ?? null),
        existing,
      });
    },
    onSuccess: () => {
      toast.success("Produto destinado ao evento. O estoque total não foi baixado.");
      invalidate();
      setAllocOpen(false);
      setAllocForm({ productId: "", qty: "1", price: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number | null }) =>
      updateEventItem(id, { unit_price: price }),
    onSuccess: () => {
      toast.success("Preço do evento atualizado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (item: EventItem) => removeEventItem(item),
    onSuccess: () => {
      toast.success("Reserva devolvida ao estoque total.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: (status: EventStatus) => updateEvent(eventId, { status }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeEvent(eventId, eventItems),
    onSuccess: () => {
      toast.success("Evento finalizado. As garrafas não vendidas voltaram ao estoque total.");
      setFinalizing(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!selling || !event) throw new Error("Selecione o item.");
      const product = productById.get(selling.product_id);
      if (!product) throw new Error("Produto não encontrado.");
      const qty = Math.round(Number(sellQty));
      const price = sellPrice ? Number(sellPrice) : effectivePrice(selling, product.price);
      await registerSale({
        event,
        item: selling,
        productName: `${product.name} ${product.volume_ml}ml`,
        quantity: qty,
        unitPrice: price,
        productStock: product.stock_qty,
      });
    },
    onSuccess: () => {
      toast.success("Venda registrada. Estoque do evento e total atualizados.");
      setSelling(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openSale(item: EventItem, product: Product | undefined) {
    setSelling(item);
    setSellQty("1");
    setSellPrice(String(effectivePrice(item, product?.price ?? 0)));
  }

  if (!event) {
    return (
      <AppShell title="Evento" description="Carregando…">
        <p className="text-sm text-muted-foreground">Buscando dados do evento…</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={event.name}
      description={`${event.location || "Local não informado"} · ${EVENT_STATUS_LABEL[event.status]}`}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link to="/eventos">
            <ArrowLeft className="size-4" /> Eventos
          </Link>
        </Button>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">No evento</p>
          <p className="text-2xl font-semibold">{totals.reservedQty}</p>
          <p className="text-xs text-muted-foreground">garrafas reservadas</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor em estoque</p>
          <p className="text-2xl font-semibold">{formatBRL(totals.stockValue)}</p>
          <p className="text-xs text-muted-foreground">preço deste evento</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendidas</p>
          <p className="text-2xl font-semibold">{totals.sold}</p>
          <p className="text-xs text-muted-foreground">unidades</p>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Faturamento</p>
          <p className="text-2xl font-semibold text-primary">{formatBRL(totals.revenue)}</p>
          <p className="text-xs text-muted-foreground">vendas do evento</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={event.status}
          onValueChange={(v) => statusMutation.mutate(v as EventStatus)}
          disabled={finished}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v} disabled={v === "finalizado"}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={finished} onClick={() => setAllocOpen(true)}>
          <Plus className="size-4" /> Destinar produto
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={finished}
          onClick={() => setFinalizing(true)}
        >
          <CheckCircle2 className="size-4" /> Finalizar evento
        </Button>
        {finished ? (
          <Badge variant="secondary">
            Evento finalizado — sobras devolvidas ao estoque total
          </Badge>
        ) : null}
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Destinado</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">No evento</TableHead>
              <TableHead className="text-right">Devolvido</TableHead>
              <TableHead className="text-right">Preço no evento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nenhum produto destinado a este evento.
                </TableCell>
              </TableRow>
            ) : (
              eventItems.map((item) => {
                const product = productById.get(item.product_id);
                const remaining = Math.max(
                  0,
                  item.allocated_qty - item.sold_qty - item.returned_qty,
                );
                const price = effectivePrice(item, product?.price ?? 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {product ? `${product.name} ${product.volume_ml}ml` : "Produto removido"}
                      <span className="block text-xs text-muted-foreground">
                        padrão: {formatBRL(Number(product?.price ?? 0))}
                        {item.unit_price !== null ? " · preço editado" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{item.allocated_qty}</TableCell>
                    <TableCell className="text-right">{item.sold_qty}</TableCell>
                    <TableCell className="text-right font-semibold">{remaining}</TableCell>
                    <TableCell className="text-right">{item.returned_qty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        disabled={finished}
                        defaultValue={price}
                        onBlur={(e) => {
                          const value = e.target.value === "" ? null : Number(e.target.value);
                          if (value !== price)
                            priceMutation.mutate({ id: item.id, price: value });
                        }}
                        className="ml-auto h-8 w-28 text-right"
                        aria-label="Preço no evento"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          disabled={finished || remaining === 0}
                          onClick={() => openSale(item, product)}
                        >
                          Vender
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Devolver ao estoque total"
                          disabled={finished || remaining === 0}
                          onClick={() => removeMutation.mutate(item)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Vendas do evento
      </h2>
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nenhuma venda registrada.
                </TableCell>
              </TableRow>
            ) : (
              eventSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(sale.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{sale.item_name}</TableCell>
                  <TableCell className="text-right">{sale.quantity}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(sale.unit_price))}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(Number(sale.total))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* destinar */}
      <Dialog open={allocOpen} onOpenChange={setAllocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destinar produto ao evento</DialogTitle>
            <DialogDescription>
              A quantidade fica reservada para esta feira. O estoque total só baixa quando a venda
              for registrada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select
                value={allocForm.productId}
                onValueChange={(v) => {
                  const product = productById.get(v);
                  setAllocForm({
                    ...allocForm,
                    productId: v,
                    price: product?.price !== null && product?.price !== undefined
                      ? String(product.price)
                      : "",
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {allocatable.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.volume_ml}ml · livre:{" "}
                      {availableQty(p.stock_qty, reserved.get(p.id)?.qty ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aqty">Quantidade</Label>
              <Input
                id="aqty"
                type="number"
                min={1}
                value={allocForm.qty}
                onChange={(e) => setAllocForm({ ...allocForm, qty: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aprice">Preço neste evento (R$)</Label>
              <Input
                id="aprice"
                type="number"
                step="0.01"
                min={0}
                value={allocForm.price}
                onChange={(e) => setAllocForm({ ...allocForm, price: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Vem do preço padrão do produto. Altere se o preço da feira for diferente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => allocMutation.mutate()} disabled={allocMutation.isPending}>
              Destinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* venda */}
      <Dialog open={Boolean(selling)} onOpenChange={(o) => !o && setSelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar venda</DialogTitle>
            <DialogDescription>
              {selling
                ? `${productById.get(selling.product_id)?.name ?? "Produto"} — ${
                    selling.allocated_qty - selling.sold_qty - selling.returned_qty
                  } disponíveis no evento`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sqty">Quantidade vendida</Label>
              <Input
                id="sqty"
                type="number"
                min={1}
                value={sellQty}
                onChange={(e) => setSellQty(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprice">Preço unitário (R$)</Label>
              <Input
                id="sprice"
                type="number"
                step="0.01"
                min={0}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">
                {formatBRL(Number(sellQty) * Number(sellPrice || 0))}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelling(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saleMutation.mutate()} disabled={saleMutation.isPending}>
              Registrar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* finalizar */}
      <Dialog open={finalizing} onOpenChange={setFinalizing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar evento</DialogTitle>
            <DialogDescription>
              As {totals.reservedQty} garrafa(s) não vendidas voltam para o estoque total e o evento
              é marcado como finalizado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
