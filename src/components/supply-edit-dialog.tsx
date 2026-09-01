import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { SUPPLY_LABEL, updateSupply, type Supply, type SupplyType } from "@/lib/inventory";

export function SupplyEditDialog({
  supply,
  onClose,
}: {
  supply: Supply;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: supply.name,
    type: supply.type,
    unit: supply.unit,
    min_stock: String(supply.min_stock),
    notes: supply.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do insumo.");
      await updateSupply(supply.id, {
        name: form.name.trim().slice(0, 120),
        type: form.type,
        unit: form.unit.trim().slice(0, 20) || "un",
        min_stock: Number(form.min_stock) || 0,
        notes: form.notes.trim() ? form.notes.trim() : null,
      });
    },
    onSuccess: () => {
      toast.success("Insumo atualizado.");
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar insumo</DialogTitle>
          <DialogDescription>Renomeie ou ajuste os dados deste insumo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="esname">Nome</Label>
            <Input
              id="esname"
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
            <Label htmlFor="esunit">Unidade</Label>
            <Input
              id="esunit"
              maxLength={20}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="esmin">Estoque mínimo</Label>
            <Input
              id="esmin"
              type="number"
              min={0}
              value={form.min_stock}
              onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="esnotes">Observações</Label>
            <Input
              id="esnotes"
              maxLength={300}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
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
