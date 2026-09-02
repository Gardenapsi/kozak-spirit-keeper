import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsAdmin } from "@/lib/admin";
import { clearMovements, deleteMovement, fetchMovements, KIND_LABEL } from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Histórico de entradas, saídas e ajustes de estoque da cachaçaria artesanal КОЗАКИ ГОРІЛКА.",
      },
      { property: "og:title", content: "Movimentações | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Todo o histórico de entradas, saídas e ajustes do estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Movimentacoes,
});

function Movimentacoes() {
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();
  const [confirmClear, setConfirmClear] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["movements", 300],
    queryFn: () => fetchMovements(300),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["movements"] });
  };

  const removeOne = useMutation({
    mutationFn: (id: string) => deleteMovement(id),
    onSuccess: () => {
      toast.success("Registro apagado.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAll = useMutation({
    mutationFn: clearMovements,
    onSuccess: () => {
      toast.success("Relatório de movimentações apagado.");
      setConfirmClear(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Movimentações"
      description="Histórico de entradas, saídas e ajustes"
      actions={
        isAdmin ? (
          <Button size="sm" variant="destructive" onClick={() => setConfirmClear(true)}>
            <Trash2 className="size-4" /> Apagar relatório
          </Button>
        ) : null
      }
    >
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Motivo</TableHead>
              {isAdmin ? <TableHead className="text-right">Ações</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-muted-foreground">
                  Nenhuma movimentação registrada ainda.
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{m.item_name}</TableCell>
                  <TableCell>
                    <Badge variant={m.kind === "saida" ? "destructive" : "secondary"}>
                      {KIND_LABEL[m.kind]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.reason ?? "—"}</TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Apagar registro"
                        disabled={removeOne.isPending}
                        onClick={() => removeOne.mutate(m.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todo o relatório de movimentações?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros de entradas, saídas e ajustes serão removidos do banco de dados.
              Os estoques atuais dos produtos e insumos não são alterados. Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                clearAll.mutate();
              }}
              disabled={clearAll.isPending}
            >
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
