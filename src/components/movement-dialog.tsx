import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  checkSuppliesForProduction,
  KIND_LABEL,
  registerMovement,
  type MovementKind,
} from "@/lib/inventory";


export type MovementTarget = {
  kindOf: "product" | "supply";
  id: string;
  name: string;
  currentQty: number;
};

export function MovementDialog({
  target,
  onClose,
}: {
  target: MovementTarget | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<MovementKind>("entrada");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  const qtyNumber = Number(quantity);
  const production =
    target?.kindOf === "product"
      ? kind === "entrada"
        ? Math.max(0, Math.round(qtyNumber || 0))
        : kind === "ajuste"
          ? Math.max(0, Math.round((qtyNumber || 0) - target.currentQty))
          : 0
      : 0;

  const { data: check } = useQuery({
    queryKey: ["supply-check", target?.id, production],
    queryFn: () => checkSuppliesForProduction(target!.id, production),
    enabled: Boolean(target && target.kindOf === "product" && production > 0),
  });



  const mutation = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty < 0) throw new Error("Informe uma quantidade válida.");
      await registerMovement({
        kind,
        quantity: Math.round(qty),
        reason: reason.trim() || undefined,
        itemName: target.name,
        currentQty: target.currentQty,
        ...(target.kindOf === "product" ? { productId: target.id } : { supplyId: target.id }),
      });
    },
    onSuccess: () => {
      toast.success("Estoque atualizado.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      setQuantity("1");
      setReason("");
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={Boolean(target)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {target?.name} — estoque atual: {target?.currentQty ?? 0}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MovementKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qtd">
              {kind === "ajuste" ? "Nova quantidade em estoque" : "Quantidade"}
            </Label>
            <Input
              id="qtd"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Input
              id="motivo"
              maxLength={200}
              placeholder="Ex.: venda feira, produção do lote 12"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {check && production > 0 ? (
            !check.hasRecipe ? (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                Nenhum insumo vinculado a este produto. Cadastre a receita (garrafa, tampa, rótulo…)
                na edição do produto antes de dar entrada em estoque.
              </div>
            ) : (
              <div
                className={`rounded-md border p-3 text-sm ${
                  check.ok
                    ? "border-border bg-muted/40 text-muted-foreground"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                }`}
              >
                <p className="font-medium">
                  {check.ok
                    ? `Insumos que serão baixados para produzir ${production}:`
                    : "Insumos insuficientes para esta produção:"}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {check.needs.map((n) => (
                    <li key={n.supplyId}>
                      {n.name}: precisa {n.needed} {n.unit} · disponível {n.available}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending ||
              (production > 0 && Boolean(check) && (!check!.hasRecipe || !check!.ok))
            }
          >
            Registrar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
