import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  CATEGORY_LABEL,
  STATUS_LABEL,
  SUPPLY_LABEL,
  saveRecipe,
  updateProduct,
  type Product,
  type ProductCategory,
  type ProductStatus,
  type ProductSupply,
  type RecipeItem,
  type Supply,
} from "@/lib/inventory";

export function ProductEditDialog({
  product,
  supplies,
  recipe,
  onClose,
}: {
  product: Product;
  supplies: Supply[];
  recipe: ProductSupply[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: product.name,
    category: product.category,
    volume_ml: String(product.volume_ml),
    status: product.status,
    launch_date: product.launch_date ?? "",
    min_stock: String(product.min_stock),
    price: product.price === null ? "" : String(product.price),
    is_premium: product.is_premium,
    notes: product.notes ?? "",
  });
  const [items, setItems] = useState<RecipeItem[]>(
    recipe.map((r) => ({ supplyId: r.supply_id, qty: Number(r.qty_per_unit) })),
  );

  const available = supplies.filter((s) => !items.some((i) => i.supplyId === s.id));

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do produto.");
      if (items.some((i) => !i.supplyId)) throw new Error("Selecione o insumo em todas as linhas.");
      await updateProduct(product.id, {
        name: form.name.trim().slice(0, 120),
        category: form.category,
        volume_ml: Number(form.volume_ml) || product.volume_ml,
        status: form.status,
        launch_date: form.launch_date || null,
        min_stock: Number(form.min_stock) || 0,
        price: form.price ? Number(form.price) : null,
        is_premium: form.is_premium,
        notes: form.notes.trim() ? form.notes.trim() : null,
      });
      await saveRecipe(
        product.id,
        items.map((i) => ({ supplyId: i.supplyId, qty: i.qty > 0 ? i.qty : 1 })),
      );
    },
    onSuccess: () => {
      toast.success("Produto atualizado.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_supplies"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>
            Altere nome, dados e os insumos usados para engarrafar este rótulo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ename">Nome</Label>
            <Input
              id="ename"
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
            <Label htmlFor="evol">Volume (ml)</Label>
            <Input
              id="evol"
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
            <Label htmlFor="elaunch">Lançamento previsto</Label>
            <Input
              id="elaunch"
              type="date"
              value={form.launch_date}
              onChange={(e) => setForm({ ...form, launch_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emin">Estoque mínimo</Label>
            <Input
              id="emin"
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eprice">Preço de venda (R$)</Label>
            <Input
              id="eprice"
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Premium</Label>
            <Select
              value={form.is_premium ? "sim" : "nao"}
              onValueChange={(v) => setForm({ ...form, is_premium: v === "sim" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nao">Não</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="enotes">Observações</Label>
            <Input
              id="enotes"
              maxLength={300}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-2 space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Insumos para engarrafar</p>
              <p className="text-xs text-muted-foreground">
                Quantidade usada por unidade produzida (ex.: 1 garrafa, 1 tampa, 2 rótulos).
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={available.length === 0}
              onClick={() =>
                setItems([...items, { supplyId: available[0]?.id ?? "", qty: 1 }])
              }
            >
              <Plus className="size-4" /> Insumo
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum insumo vinculado.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={`${item.supplyId}-${index}`} className="flex items-center gap-2">
                  <Select
                    value={item.supplyId}
                    onValueChange={(v) =>
                      setItems(items.map((it, i) => (i === index ? { ...it, supplyId: v } : it)))
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione o insumo" />
                    </SelectTrigger>
                    <SelectContent>
                      {supplies
                        .filter((s) => s.id === item.supplyId || !items.some((i) => i.supplyId === s.id))
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} · {SUPPLY_LABEL[s.type]}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.qty}
                    onChange={(e) =>
                      setItems(
                        items.map((it, i) =>
                          i === index ? { ...it, qty: Number(e.target.value) } : it,
                        ),
                      )
                    }
                    className="w-24"
                    aria-label="Quantidade por unidade"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remover insumo"
                    onClick={() => setItems(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
