import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { effectivePrice, EVENT_STATUS_LABEL, formatBRL } from "@/lib/events";
import { KIND_LABEL } from "@/lib/inventory";
import { eventItemsQuery, eventsQuery, movementsQuery, productsQuery, salesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/relatorios")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(salesQuery);
    void context.queryClient.prefetchQuery(productsQuery);
    void context.queryClient.prefetchQuery(eventsQuery);
    void context.queryClient.prefetchQuery(eventItemsQuery);
    void context.queryClient.prefetchQuery(movementsQuery);
  },
  head: () => ({
    meta: [
      { title: "Relatórios | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Relatórios de movimentações, vendas por feira e valor do estoque da cachaçaria artesanal КОЗАКИ ГОРІЛКА.",
      },
      { property: "og:title", content: "Relatórios | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Faturamento por evento, itens vendidos e valor total em estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const { data: sales } = useQuery(salesQuery);
  const { data: products } = useQuery(productsQuery);
  const { data: events } = useQuery(eventsQuery);
  const { data: items } = useQuery(eventItemsQuery);
  const { data: movements } = useQuery(movementsQuery);

  const [eventFilter, setEventFilter] = useState<string>("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const productById = useMemo(() => new Map((products ?? []).map((p) => [p.id, p])), [products]);
  const eventById = useMemo(() => new Map((events ?? []).map((e) => [e.id, e])), [events]);

  const inRange = (iso: string) => {
    const day = iso.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const filteredSales = useMemo(
    () =>
      (sales ?? []).filter(
        (s) => (eventFilter === "todos" || s.event_id === eventFilter) && inRange(s.created_at),
      ),
    [sales, eventFilter, from, to],
  );

  const salesTotals = useMemo(() => {
    const qty = filteredSales.reduce((a, s) => a + s.quantity, 0);
    const revenue = filteredSales.reduce((a, s) => a + Number(s.total), 0);
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    const byEvent = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of filteredSales) {
      const pk = s.product_id ?? s.item_name;
      const p = byProduct.get(pk) ?? { name: s.item_name, qty: 0, revenue: 0 };
      p.qty += s.quantity;
      p.revenue += Number(s.total);
      byProduct.set(pk, p);

      const ek = s.event_id ?? "sem-evento";
      const e = byEvent.get(ek) ?? {
        name: s.event_name ?? "Venda direta",
        qty: 0,
        revenue: 0,
      };
      e.qty += s.quantity;
      e.revenue += Number(s.total);
      byEvent.set(ek, e);
    }
    return {
      qty,
      revenue,
      byProduct: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue),
      byEvent: [...byEvent.values()].sort((a, b) => b.revenue - a.revenue),
    };
  }, [filteredSales]);

  /** Valor em estoque: livre a preço padrão + reservado a preço do evento. */
  const stockReport = useMemo(() => {
    const openEvents = new Set(
      (events ?? []).filter((e) => e.status !== "finalizado").map((e) => e.id),
    );
    const reservedRows = new Map<
      string,
      { qty: number; value: number; events: { name: string; qty: number; price: number }[] }
    >();
    for (const item of items ?? []) {
      if (!openEvents.has(item.event_id)) continue;
      const remaining = Math.max(0, item.allocated_qty - item.sold_qty - item.returned_qty);
      if (remaining <= 0) continue;
      const product = productById.get(item.product_id);
      const price = effectivePrice(item, product?.price ?? 0);
      const entry = reservedRows.get(item.product_id) ?? { qty: 0, value: 0, events: [] };
      entry.qty += remaining;
      entry.value += remaining * price;
      entry.events.push({
        name: eventById.get(item.event_id)?.name ?? "Evento",
        qty: remaining,
        price,
      });
      reservedRows.set(item.product_id, entry);
    }

    const rows = (products ?? []).map((p) => {
      const reserved = reservedRows.get(p.id);
      const reservedQty = reserved?.qty ?? 0;
      const freeQty = Math.max(0, p.stock_qty - reservedQty);
      const standard = Number(p.price ?? 0);
      const freeValue = freeQty * standard;
      const reservedValue = reserved?.value ?? 0;
      return {
        id: p.id,
        name: `${p.name} ${p.volume_ml}ml`,
        standard,
        freeQty,
        freeValue,
        reservedQty,
        reservedValue,
        events: reserved?.events ?? [],
        totalQty: p.stock_qty,
        totalValue: freeValue + reservedValue,
      };
    });

    return {
      rows,
      totalQty: rows.reduce((a, r) => a + r.totalQty, 0),
      totalValue: rows.reduce((a, r) => a + r.totalValue, 0),
      reservedQty: rows.reduce((a, r) => a + r.reservedQty, 0),
      reservedValue: rows.reduce((a, r) => a + r.reservedValue, 0),
    };
  }, [products, items, events, productById, eventById]);

  const filteredMovements = useMemo(
    () => (movements ?? []).filter((m) => inRange(m.created_at)),
    [movements, from, to],
  );

  return (
    <AppShell title="Relatórios" description="Movimentações, vendas e valor em estoque">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Evento (vendas)</Label>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              {(events ?? []).map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name} · {EVENT_STATUS_LABEL[e.status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Valor em estoque</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Unidades vendidas
              </p>
              <p className="text-2xl font-semibold">{salesTotals.qty}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Faturamento</p>
              <p className="text-2xl font-semibold text-primary">
                {formatBRL(salesTotals.revenue)}
              </p>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <h2 className="p-4 pb-2 text-sm font-semibold">Por evento</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTotals.byEvent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesTotals.byEvent.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{row.qty}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBRL(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="panel overflow-x-auto">
            <h2 className="p-4 pb-2 text-sm font-semibold">Por produto</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTotals.byProduct.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesTotals.byProduct.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{row.qty}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBRL(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="panel overflow-x-auto">
            <h2 className="p-4 pb-2 text-sm font-semibold">Vendas detalhadas</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{s.item_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.event_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">{s.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(Number(s.unit_price))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatBRL(Number(s.total))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Garrafas em estoque
              </p>
              <p className="text-2xl font-semibold">{stockReport.totalQty}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Valor total</p>
              <p className="text-2xl font-semibold text-primary">
                {formatBRL(stockReport.totalValue)}
              </p>
            </div>
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Em feiras (reservado)
              </p>
              <p className="text-2xl font-semibold">{stockReport.reservedQty}</p>
            </div>
            <div className="panel p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Valor em feiras
              </p>
              <p className="text-2xl font-semibold">{formatBRL(stockReport.reservedValue)}</p>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Preço padrão</TableHead>
                  <TableHead className="text-right">Livre</TableHead>
                  <TableHead className="text-right">Em feiras</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReport.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.events.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {row.events.map((e) => (
                            <Badge key={e.name} variant="outline" className="text-[0.65rem]">
                              {e.qty} un · {e.name} · {formatBRL(e.price)}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(row.standard)}</TableCell>
                    <TableCell className="text-right">{row.freeQty}</TableCell>
                    <TableCell className="text-right">
                      {row.reservedQty > 0 ? (
                        <span className="font-semibold text-accent">{row.reservedQty}</span>
                      ) : (
                        "0"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{row.totalQty}</TableCell>
                    <TableCell className="text-right">{formatBRL(row.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Nenhuma movimentação no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>{m.item_name}</TableCell>
                      <TableCell>
                        <Badge variant={m.kind === "saida" ? "secondary" : "outline"}>
                          {KIND_LABEL[m.kind]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{m.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.reason ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
