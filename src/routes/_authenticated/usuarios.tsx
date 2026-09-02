import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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
import {
  CLASS_LABEL,
  fetchProfiles,
  setClassification,
  useIsAdmin,
  usePresence,
  type UserClass,
} from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários | Estoque КОЗАКИ ГОРІЛКА" },
      {
        name: "description",
        content:
          "Painel administrativo de usuários com acesso ao controle de estoque КОЗАКИ ГОРІЛКА.",
      },
      { property: "og:title", content: "Usuários | Estoque КОЗАКИ ГОРІЛКА" },
      {
        property: "og:description",
        content: "Lista de usuários, presença on-line e classificação de acesso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Usuarios,
});

function Usuarios() {
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: loadingRole } = useIsAdmin();
  const online = usePresence();

  const { data, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
    enabled: Boolean(isAdmin),
  });

  const classMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: UserClass }) => setClassification(id, value),
    onSuccess: () => {
      toast.success("Classificação atualizada.");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!loadingRole && !isAdmin) {
    return (
      <AppShell title="Usuários" description="Acesso restrito">
        <div className="panel p-6 text-sm text-muted-foreground">
          Esta área é exclusiva do administrador do sistema.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Usuários" description="Acessos, presença on-line e classificação">
      <div className="panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Classificação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || loadingRole ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : (data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              (data ?? []).map((p) => {
                const isOnline = online.includes(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.email ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isOnline ? "default" : "secondary"}>
                        {isOnline ? "On-line" : "Off-line"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={p.classification}
                        onValueChange={(v) =>
                          classMutation.mutate({ id: p.id, value: v as UserClass })
                        }
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CLASS_LABEL).map(([v, l]) => (
                            <SelectItem key={v} value={v}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        O status on-line reflete quem está com o sistema aberto neste momento.
      </p>
    </AppShell>
  );
}
