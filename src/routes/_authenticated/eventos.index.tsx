import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  createEvent,
  deleteEvent,
  EVENT_STATUS_LABEL,
  formatBRL,
  type Event,
  type EventStatus,
} from "@/lib/events";
import { eventItemsQuery, eventsQuery, salesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/eventos/")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(eventsQuery);
    void context.queryClient.prefetchQuery(eventItemsQuery);
    void context.queryClient.prefetchQuery(salesQuery);
  },
  head: () => ({
    meta: [
      { title: "Feiras e eventos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Controle o estoque destinado a cada feira artesanal, registre vendas e acompanhe o faturamento por evento.",
      },
      { property: "og:title", content: "Feiras e eventos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Estoque separado por evento, vendas e faturamento da cachaçaria artesanal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Eventos,
});

function statusBadge(status: EventStatus) {
  if (status === "ativo") return <Badge>Em andamento</Badge>;
  if (status === "finalizado") return <Badge variant="secondary">Finalizado</Badge>;
  return <Badge variant="outline">Planejado</Badge>;
}

function NewEventDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    location: "",
    starts_on: "",
    ends_on: "",
    status: "planejado" as EventStatus,
  });

  const { data: products } = useQuery(productsQuery);
  const { data: allItems } = useQuery(eventItemsQuery);
  const { data: allEvents } = useQuery(eventsQuery);

  const rows = useMemo(() => {
    const reserved = reservedByProduct(allItems ?? [], allEvents ?? []);
    return (products ?? [])
      .filter((p) => p.status !== "descontinuado")
      .map((p) => ({
        product: p,
        free: availableQty(p.stock_qty, reserved.get(p.id)?.qty ?? 0),
      }));
  }, [products, allItems, allEvents]);

  const visibleRows = useMemo(
    () => (showEmpty ? rows : rows.filter((r) => r.free > 0)),
    [rows, showEmpty],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do evento.");
      const chosen = rows
        .map((r) => ({ ...r, qty: Math.floor(Number(qtys[r.product.id] ?? 0)) || 0 }))
        .filter((r) => r.qty > 0);
      for (const r of chosen) {
        if (r.qty > r.free)
          throw new Error(`${r.product.name}: só há ${r.free} unidade(s) livre(s) em estoque.`);
      }
      const eventId = await createEvent({
        name: form.name.trim().slice(0, 120),
        location: form.location.trim() || null,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        status: form.status,
      });
      for (const r of chosen) {
        await allocateToEvent({
          eventId,
          productId: r.product.id,
          qty: r.qty,
          unitPrice: r.product.price === null ? null : Number(r.product.price),
        });
      }
      return chosen.length;
    },
    onSuccess: (count) => {
      toast.success(
        count > 0
          ? `Evento criado com ${count} produto(s) destinado(s).`
          : "Evento criado. Destine os produtos que vão para a feira.",
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event_items"] });
      setOpen(false);
      setQtys({});
      setForm({ name: "", location: "", starts_on: "", ends_on: "", status: "planejado" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova feira / evento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ename">Nome</Label>
            <Input
              id="ename"
              maxLength={120}
              placeholder="Ex.: Feira Artesanal do Centro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="eloc">Local</Label>
            <Input
              id="eloc"
              maxLength={160}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estart">Início</Label>
            <Input
              id="estart"
              type="date"
              value={form.starts_on}
              onChange={(e) => setForm({ ...form, starts_on: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eend">Fim</Label>
            <Input
              id="eend"
              type="date"
              value={form.ends_on}
              onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Situação</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as EventStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_STATUS_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Produtos para o evento</p>
              <p className="text-xs text-muted-foreground">
                Informe quantas unidades de cada produto você leva. O estoque total só baixa quando a
                venda for registrada.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={showEmpty}
                onCheckedChange={(v) => setShowEmpty(v === true)}
                aria-label="Mostrar produtos sem estoque"
              />
              Mostrar produtos sem estoque
            </label>
          </div>

          <div className="space-y-2">
            {visibleRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum produto com estoque livre. Marque a caixa acima para ver todos.
              </p>
            ) : (
              visibleRows.map(({ product, free }) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {product.volume_ml} ml · livre: {free} · {formatBRL(product.price)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={free}
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={`Quantidade de ${product.name}`}
                    className="w-20"
                    value={qtys[product.id] ?? ""}
                    onChange={(e) => setQtys({ ...qtys, [product.id]: e.target.value })}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Criar evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function Eventos() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery(eventsQuery);
  const { data: items } = useQuery(eventItemsQuery);
  const { data: sales } = useQuery(salesQuery);
  const [removing, setRemoving] = useState<Event | null>(null);

  const summary = useMemo(() => {
    const map = new Map<string, { reserved: number; sold: number; revenue: number }>();
    for (const item of items ?? []) {
      const entry = map.get(item.event_id) ?? { reserved: 0, sold: 0, revenue: 0 };
      entry.reserved += Math.max(0, item.allocated_qty - item.sold_qty - item.returned_qty);
      map.set(item.event_id, entry);
    }
    for (const sale of sales ?? []) {
      if (!sale.event_id) continue;
      const entry = map.get(sale.event_id) ?? { reserved: 0, sold: 0, revenue: 0 };
      entry.sold += sale.quantity;
      entry.revenue += Number(sale.total);
      map.set(sale.event_id, entry);
    }
    return map;
  }, [items, sales]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      toast.success("Evento excluído. O estoque reservado volta para o total.");
      setRemoving(null);
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Feiras e eventos"
      description="Estoque destinado, vendas e faturamento por evento"
      actions={<NewEventDialog />}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (events ?? []).length === 0 ? (
        <div className="panel p-6 text-sm text-muted-foreground">
          Nenhum evento cadastrado. Crie a primeira feira para separar o estoque que você leva.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(events ?? []).map((event) => {
            const s = summary.get(event.id) ?? { reserved: 0, sold: 0, revenue: 0 };
            return (
              <div key={event.id} className="panel flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{event.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {event.location || "Local não informado"}
                    </p>
                  </div>
                  {statusBadge(event.status)}
                </div>

                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {event.starts_on
                    ? new Date(`${event.starts_on}T12:00:00`).toLocaleDateString("pt-BR")
                    : "sem data"}
                  {event.ends_on
                    ? ` — ${new Date(`${event.ends_on}T12:00:00`).toLocaleDateString("pt-BR")}`
                    : ""}
                </p>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      No evento
                    </p>
                    <p className="text-lg font-semibold">{s.reserved}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      Vendidas
                    </p>
                    <p className="text-lg font-semibold">{s.sold}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                      Faturado
                    </p>
                    <p className="text-sm font-semibold">{formatBRL(s.revenue)}</p>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/eventos/$eventId" params={{ eventId: event.id }}>
                      Abrir evento
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Excluir ${event.name}`}
                    onClick={() => setRemoving(event)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} e as reservas de estoque dele serão removidos. As vendas já
              registradas continuam nos relatórios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removing) deleteMutation.mutate(removing.id);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
