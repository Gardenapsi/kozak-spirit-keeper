import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMovements, KIND_LABEL } from "@/lib/inventory";

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
  const { data, isLoading } = useQuery({
    queryKey: ["movements"],
    queryFn: () => fetchMovements(300),
  });

  return (
    <AppShell title="Movimentações" description="Histórico de entradas, saídas e ajustes">
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
