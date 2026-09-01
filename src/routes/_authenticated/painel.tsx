import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Boxes, CalendarClock, Package, TrendingDown } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_LABEL,
  fetchMovements,
  fetchProducts,
  fetchSupplies,
  KIND_LABEL,
  monthsUntil,
  stockLevel,
  SUPPLY_LABEL,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel de Estoque | КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Visão geral do estoque de cachaças, licores e insumos da cachaçaria artesanal КОЗАКИ ГОРІЛКА.",
      },
      { property: "og:title", content: "Painel de Estoque | КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Resumo de garrafas, insumos e alertas de estoque baixo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

function Stat({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="size-4 text-primary" />
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Painel() {
  const products = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const supplies = useQuery({ queryKey: ["supplies"], queryFn: fetchSupplies });
  const movements = useQuery({ queryKey: ["movements"], queryFn: () => fetchMovements(8) });

  const loading = products.isLoading || supplies.isLoading;
  const prods = products.data ?? [];
  const sups = supplies.data ?? [];

  const totalBottles = prods.reduce((sum, p) => sum + p.stock_qty, 0);
  const lowProducts = prods.filter(
    (p) => p.status === "ativo" && stockLevel(p.stock_qty, p.min_stock) !== "ok",
  );
  const lowSupplies = sups.filter((s) => stockLevel(s.stock_qty, s.min_stock) !== "ok");
  const upcoming = prods.filter((p) => p.status === "em_breve");

  return (
    <AppShell title="Painel" description="Visão geral do estoque da cachaçaria">
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Garrafas em estoque"
              value={totalBottles}
              icon={Package}
              hint={`${prods.filter((p) => p.status === "ativo").length} rótulos ativos`}
            />
            <Stat
              label="Insumos cadastrados"
              value={sups.length}
              icon={Boxes}
              hint={`${sups.reduce((s, i) => s + i.stock_qty, 0)} unidades totais`}
            />
            <Stat
              label="Produtos em alerta"
              value={lowProducts.length}
              icon={TrendingDown}
              hint="Abaixo ou no estoque mínimo"
            />
            <Stat
              label="Insumos em alerta"
              value={lowSupplies.length}
              icon={AlertTriangle}
              hint="Repor antes da próxima produção"
            />
          </div>

          {upcoming.length > 0 ? (
            <Card className="mt-6 border-accent/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="size-4 text-accent" /> Lançamentos previstos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcoming.map((p) => {
                  const days = monthsUntil(p.launch_date);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {p.name} · {p.volume_ml}ml
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABEL[p.category]}
                          {p.launch_date
                            ? ` · lançamento em ${new Date(p.launch_date).toLocaleDateString("pt-BR")}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {days === null ? "Sem data" : `faltam ${days} dias`}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reposição urgente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowProducts.length === 0 && lowSupplies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum item abaixo do mínimo. Tudo em ordem.
                  </p>
                ) : (
                  <>
                    {lowProducts.map((p) => (
                      <Link
                        key={p.id}
                        to="/produtos"
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span>
                          {p.name} · {p.volume_ml}ml
                        </span>
                        <Badge variant={p.stock_qty <= 0 ? "destructive" : "secondary"}>
                          {p.stock_qty} / mín. {p.min_stock}
                        </Badge>
                      </Link>
                    ))}
                    {lowSupplies.map((s) => (
                      <Link
                        key={s.id}
                        to="/insumos"
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted"
                      >
                        <span>
                          {s.name}{" "}
                          <span className="text-muted-foreground">({SUPPLY_LABEL[s.type]})</span>
                        </span>
                        <Badge variant={s.stock_qty <= 0 ? "destructive" : "secondary"}>
                          {s.stock_qty} / mín. {s.min_stock}
                        </Badge>
                      </Link>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Últimas movimentações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(movements.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
                ) : (
                  (movements.data ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate">{m.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Badge variant={m.kind === "saida" ? "destructive" : "secondary"}>
                        {KIND_LABEL[m.kind]} {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
