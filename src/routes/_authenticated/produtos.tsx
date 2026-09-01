import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { MovementDialog, type MovementTarget } from "@/components/movement-dialog";
import { ProductEditDialog } from "@/components/product-edit-dialog";
import { ReorderButtons } from "@/components/reorder-buttons";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  bottlesPossible,
  CATEGORY_LABEL,
  deleteProduct,
  monthsUntil,
  stockLevel,
  STATUS_LABEL,
  swapOrder,
  type Product,
  type ProductCategory,
  type ProductStatus,
} from "@/lib/inventory";
import { availableQty, formatBRL, reservedByProduct } from "@/lib/events";
import {
  eventItemsQuery,
  eventsQuery,
  productsQuery,
  recipesQuery,
  suppliesQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/produtos")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(productsQuery);
    void context.queryClient.prefetchQuery(suppliesQuery);
    void context.queryClient.prefetchQuery(recipesQuery);
  },
  head: () => ({
    meta: [
      { title: "Produtos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Estoque de cachaças, licores e vodka artesanais КОЗАКИ ГОРІЛКА por rótulo e volume de garrafa.",
      },
      { property: "og:title", content: "Produtos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Controle de garrafas por rótulo, volume, insumos e estoque mínimo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Produtos,
});

function levelBadge(qty: number, min: number) {
  const level = stockLevel(qty, min);
  if (level === "critico") return <Badge variant="destructive">Sem estoque</Badge>;
  if (level === "baixo") return <Badge variant="secondary">Estoque baixo</Badge>;
  return <Badge variant="outline">Ok</Badge>;
}

function NewProductDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "cachaca" as ProductCategory,
    volume_ml: "750",
    status: "ativo" as ProductStatus,
    launch_date: "",
    stock_qty: "0",
    min_stock: "0",
    price: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do produto.");
      const { error } = await supabase.from("products").insert({
        name: form.name.trim().slice(0, 120),
        category: form.category,
        volume_ml: Number(form.volume_ml) || 750,
        status: form.status,
        launch_date: form.launch_date || null,
        stock_qty: Number(form.stock_qty) || 0,
        min_stock: Number(form.min_stock) || 0,
        price: form.price ? Number(form.price) : null,
        sort_order: 99999,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto cadastrado. Edite-o para vincular os insumos.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setForm({ ...form, name: "", stock_qty: "0", price: "" });
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
          <DialogTitle>Novo produto</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pname">Nome</Label>
            <Input
              id="pname"
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pvol">Volume (ml)</Label>
            <Input
              id="pvol"
              type="number"
              min={1}
              value={form.volume_ml}
              onChange={(e) => setForm({ ...form, volume_ml: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v as ProductStatus })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plaunch">Lançamento previsto</Label>
            <Input
              id="plaunch"
              type="date"
              value={form.launch_date}
              onChange={(e) => setForm({ ...form, launch_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pqty">Estoque inicial</Label>
            <Input
              id="pqty"
              type="number"
              min={0}
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pmin">Estoque mínimo</Label>
            <Input
              id="pmin"
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pprice">Preço de venda (R$)</Label>
            <Input
              id="pprice"
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Produtos() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(productsQuery);
  const { data: supplies } = useQuery(suppliesQuery);
  const { data: recipes } = useQuery(recipesQuery);
  const [target, setTarget] = useState<MovementTarget | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [removing, setRemoving] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | ProductCategory>("todos");

  const ordered = useMemo(() => data ?? [], [data]);
  const filtering = filter !== "todos" || search.trim() !== "";

  const rows = useMemo(
    () =>
      ordered.filter(
        (p) =>
          (filter === "todos" || p.category === filter) &&
          p.name.toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [ordered, filter, search],
  );

  const recipeByProduct = useMemo(() => {
    const map = new Map<string, typeof recipes>();
    for (const row of recipes ?? []) {
      map.set(row.product_id, [...(map.get(row.product_id) ?? []), row]);
    }
    return map;
  }, [recipes]);

  const { data: events } = useQuery(eventsQuery);
  const { data: eventItems } = useQuery(eventItemsQuery);
  const reserved = useMemo(
    () => reservedByProduct(eventItems ?? [], events ?? []),
    [eventItems, events],
  );


  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });

  const minMutation = useMutation({
    mutationFn: async ({ id, min }: { id: string; min: number }) => {
      const { error } = await supabase.from("products").update({ min_stock: min }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateProducts,
    onError: (e: Error) => toast.error(e.message),
  });

  const orderMutation = useMutation({
    mutationFn: ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const a = ordered[index];
      const b = ordered[index + dir];
      if (!a || !b) return Promise.resolve();
      return swapOrder(
        "products",
        { id: a.id, sort_order: a.sort_order },
        { id: b.id, sort_order: b.sort_order },
      );
    },
    onSuccess: invalidateProducts,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Produto excluído.");
      setRemoving(null);
      invalidateProducts();
      queryClient.invalidateQueries({ queryKey: ["product_supplies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Produtos"
      description="Cachaças, licores e vodka por volume de garrafa"
      actions={<NewProductDialog />}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Buscar rótulo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtering ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Limpe a busca e o filtro para reordenar a lista.
        </p>
      ) : null}

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Ordem</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Em feiras</TableHead>
              <TableHead className="text-right">Livre</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead className="text-right">Engarrafáveis</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => {
                const days = monthsUntil(p.launch_date);
                const index = ordered.findIndex((o) => o.id === p.id);
                const recipe = recipeByProduct.get(p.id) ?? [];
                const possible = bottlesPossible(recipe, supplies ?? []);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <ReorderButtons
                        disableUp={filtering || index <= 0}
                        disableDown={filtering || index === ordered.length - 1}
                        onUp={() => orderMutation.mutate({ index, dir: -1 })}
                        onDown={() => orderMutation.mutate({ index, dir: 1 })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.is_premium ? (
                        <span className="ml-2 text-xs uppercase tracking-widest text-primary">
                          premium
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {CATEGORY_LABEL[p.category]}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{p.volume_ml}ml</TableCell>
                    <TableCell className="text-right font-semibold">{p.stock_qty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={p.min_stock}
                        onBlur={(e) => {
                          const min = Number(e.target.value);
                          if (min !== p.min_stock && min >= 0)
                            minMutation.mutate({ id: p.id, min: Math.round(min) });
                        }}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {possible === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className={possible === 0 ? "text-destructive" : ""}>{possible}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.status === "em_breve" ? (
                        <Badge variant="outline" className="border-accent text-accent">
                          Em breve{days !== null ? ` · ${days}d` : ""}
                        </Badge>
                      ) : p.status === "descontinuado" ? (
                        <Badge variant="secondary">Descontinuado</Badge>
                      ) : (
                        levelBadge(p.stock_qty, p.min_stock)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setTarget({
                              kindOf: "product",
                              id: p.id,
                              name: `${p.name} ${p.volume_ml}ml`,
                              currentQty: p.stock_qty,
                            })
                          }
                        >
                          Movimentar
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Editar ${p.name}`}
                          onClick={() => setEditing(p)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Excluir ${p.name}`}
                          onClick={() => setRemoving(p)}
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

      <MovementDialog target={target} onClose={() => setTarget(null)} />

      {editing ? (
        <ProductEditDialog
          key={editing.id}
          product={editing}
          supplies={supplies ?? []}
          recipe={recipeByProduct.get(editing.id) ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <AlertDialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} será removido junto com seus insumos vinculados. O histórico de
              movimentações é mantido.
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
