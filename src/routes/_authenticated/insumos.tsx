import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { MovementDialog, type MovementTarget } from "@/components/movement-dialog";
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
import { fetchSupplies, stockLevel, SUPPLY_LABEL, type SupplyType } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/insumos")({
  head: () => ({
    meta: [
      { title: "Insumos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Controle de garrafas, tampas, rótulos, copos e caixas de madeira para os kits da cachaçaria КОЗАКИ ГОРІЛКА.",
      },
      { property: "og:title", content: "Insumos | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Garrafas, tampas, rótulos, copos e caixas de madeira em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Insumos,
});

function NewSupplyDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "garrafa" as SupplyType,
    unit: "un",
    stock_qty: "0",
    min_stock: "0",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do insumo.");
      const { error } = await supabase.from("supplies").insert({
        name: form.name.trim().slice(0, 120),
        type: form.type,
        unit: form.unit.trim().slice(0, 20) || "un",
        stock_qty: Number(form.stock_qty) || 0,
        min_stock: Number(form.min_stock) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Insumo cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setOpen(false);
      setForm({ ...form, name: "", stock_qty: "0" });
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo insumo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sname">Nome</Label>
            <Input
              id="sname"
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as SupplyType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SUPPLY_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sunit">Unidade</Label>
            <Input
              id="sunit"
              maxLength={20}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sqty">Estoque inicial</Label>
            <Input
              id="sqty"
              type="number"
              min={0}
              value={form.stock_qty}
              onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smin">Estoque mínimo</Label>
            <Input
              id="smin"
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
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

function Insumos() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["supplies"], queryFn: fetchSupplies });
  const [target, setTarget] = useState<MovementTarget | null>(null);
  const [filter, setFilter] = useState<"todos" | SupplyType>("todos");

  const rows = useMemo(
    () => (data ?? []).filter((s) => filter === "todos" || s.type === filter),
    [data, filter],
  );

  const minMutation = useMutation({
    mutationFn: async ({ id, min }: { id: string; min: number }) => {
      const { error } = await supabase.from("supplies").update({ min_stock: min }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Insumos"
      description="Garrafas, tampas, rótulos, copos e caixas de madeira"
      actions={<NewSupplyDialog />}
    >
      <div className="mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(SUPPLY_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Nenhum insumo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const level = stockLevel(s.stock_qty, s.min_stock);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {SUPPLY_LABEL[s.type]}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {s.stock_qty} {s.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        defaultValue={s.min_stock}
                        onBlur={(e) => {
                          const min = Number(e.target.value);
                          if (min !== s.min_stock && min >= 0)
                            minMutation.mutate({ id: s.id, min: Math.round(min) });
                        }}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </TableCell>
                    <TableCell>
                      {level === "critico" ? (
                        <Badge variant="destructive">Sem estoque</Badge>
                      ) : level === "baixo" ? (
                        <Badge variant="secondary">Estoque baixo</Badge>
                      ) : (
                        <Badge variant="outline">Ok</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setTarget({
                            kindOf: "supply",
                            id: s.id,
                            name: s.name,
                            currentQty: s.stock_qty,
                          })
                        }
                      >
                        Movimentar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <MovementDialog target={target} onClose={() => setTarget(null)} />
    </AppShell>
  );
}
