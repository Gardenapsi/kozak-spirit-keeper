import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserClass = Database["public"]["Enums"]["user_class"];

export const CLASS_LABEL: Record<UserClass, string> = {
  master: "Usuário final master",
  subordinado: "Usuário final subordinado",
  indefinido: "Não classificado",
};

const PRESENCE_TOPIC = "presenca-usuarios";

/** Verdadeiro quando o usuário logado tem o papel de administrador. */
export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: uid,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function setClassification(id: string, classification: UserClass) {
  const { error } = await supabase.from("profiles").update({ classification }).eq("id", id);
  if (error) throw error;
}

/**
 * Entra no canal de presença e devolve os ids online.
 * Todos os usuários autenticados entram (via AppShell), então o admin
 * consegue ver quem está simultaneamente on-line.
 */
export function usePresence() {
  const [online, setOnline] = useState<string[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;

      const existing = supabase
        .getChannels()
        .find((c) => c.topic === `realtime:${PRESENCE_TOPIC}`);
      if (existing) await supabase.removeChannel(existing);
      if (cancelled) return;

      channel = supabase.channel(PRESENCE_TOPIC, {
        config: { presence: { key: uid } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          setOnline(Object.keys(channel?.presenceState() ?? {}));
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            void channel?.track({ user_id: uid, at: new Date().toISOString() });
          }
        });
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return online;
}
