import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, Package, ScrollText, ShieldCheck } from "lucide-react";

import cossaco from "@/assets/cossaco.jpg.asset.json";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "КОЗАКИ ГОРІЛКА | Controle de Estoque da Cachaçaria Artesanal" },
      {
        name: "description",
        content:
          "Sistema on-line de controle de estoque da cachaçaria artesanal КОЗАКИ ГОРІЛКА: cachaças, licores, vodka, garrafas, tampas, rótulos, copos e caixas de madeira.",
      },
      { property: "og:title", content: "КОЗАКИ ГОРІЛКА | Controle de Estoque" },
      {
        property: "og:description",
        content:
          "Controle de estoque de cachaças, licores e insumos da cachaçaria artesanal КОЗАКИ ГОРІЛКА, acessível de qualquer lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    icon: Package,
    title: "Rótulos e volumes",
    text: "Cachaças 750ml e 275ml, licores 500ml, edição limitada e lançamentos futuros como a Vodka Mel com Pimenta.",
  },
  {
    icon: Boxes,
    title: "Insumos da produção",
    text: "Garrafas, tampas, rótulos, copos e caixas de madeira dos kits, com estoque mínimo por item.",
  },
  {
    icon: ScrollText,
    title: "Histórico completo",
    text: "Toda entrada, saída e ajuste fica registrada com data, quantidade e motivo.",
  },
  {
    icon: ShieldCheck,
    title: "Acesso protegido",
    text: "Entre com e-mail ou Google e edite o estoque de qualquer lugar, no celular ou no computador.",
  },
];

function Home() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <div>
          <p className="brand-title text-sm text-primary sm:text-base">КОЗАКИ ГОРІЛКА</p>
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
            Cachaçaria Artesanal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="grid items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-16">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Sistema de estoque
            </p>
            <h1 className="mt-4 text-4xl leading-tight sm:text-5xl lg:text-6xl">
              O estoque da destilaria na palma da mão
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Controle cada garrafa, cada tampa e cada caixa de madeira em um só lugar. Dados
              guardados on-line, prontos para consultar e editar de onde você estiver.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Acessar o sistema</Link>
              </Button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border shadow-brass">
            <img
              src={cossaco.url}
              alt="Cossaco com copo de cachaça, identidade visual da КОЗАКИ ГОРІЛКА"
              className="h-[420px] w-full object-cover object-top sm:h-[560px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-6 pt-20">
              <p className="brand-title text-lg text-primary">КОЗАКИ ГОРІЛКА</p>
              <p className="text-sm text-muted-foreground">Tradição cossaca, alambique brasileiro</p>
            </div>
          </div>
        </section>

        <section className="border-t px-5 py-14 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="panel p-5">
                <Icon className="size-5 text-primary" />
                <h2 className="mt-4 text-lg">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t px-5 py-8 text-xs text-muted-foreground sm:px-8">
        КОЗАКИ ГОРІЛКА · Cachaçaria Artesanal · Controle de estoque interno
      </footer>
    </div>
  );
}
