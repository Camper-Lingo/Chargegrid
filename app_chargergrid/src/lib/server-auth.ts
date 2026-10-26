// Login do usuário dentro das funções de servidor (IA de viagem).
//
// Por que não usar o requireSupabaseAuth (gerado pelo Lovable)?
// Ele lê SUPABASE_URL só de process.env, que nem sempre existe rodando
// localmente (npm run dev). Aqui também aceitamos as variáveis VITE_* do .env,
// e em vez de quebrar a função inteira devolvemos null quando não há login,
// para o FAQ continuar respondendo.

import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function env(name: string): string | undefined {
  const procEnv =
    typeof process !== "undefined"
      ? process.env
      : undefined;

  const viteEnv = import.meta.env as Record<
    string,
    string | undefined
  >;

  // Prioriza as mesmas variáveis usadas pelo
  // aplicativo React para autenticação.
  return (
    viteEnv?.[`VITE_${name}`] ||
    procEnv?.[`VITE_${name}`] ||
    procEnv?.[name]
  );
}

function supabaseFetch(key: string): typeof fetch {
  const isNewKey = key.startsWith("sb_publishable_") || key.startsWith("sb_secret_");
  return (input, init) => {
    const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export type UserSession = {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
};

/** Usuário logado que fez a chamada, ou null (sem login / config faltando). */
export async function getUserSession(
  accessToken?: string
): Promise<UserSession | null> {
  try {
    const url = env("SUPABASE_URL");
    const key = env("SUPABASE_PUBLISHABLE_KEY");
    if (!url || !key) {
      console.error("[server-auth] SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY não encontradas no .env");
      console.error("[ChargeGrid Auth] Configuração:", {
        hasUrl: Boolean(url),
        hasKey: Boolean(key),
      });
      return null;
    }

    const auth = getRequest()?.headers.get("authorization") ?? "";
    const token =
      accessToken ||
      (auth.startsWith("Bearer ") ? auth.slice(7) : "");
      console.log("[ChargeGrid Auth] Token recebido:", Boolean(token));
    if (!token) return null;

    const supabase = createClient<Database>(url, key, {
      global: { fetch: supabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    try {
      const tokenPayload = token.split(".")[1];

      if (!tokenPayload) {
        throw new Error("Token JWT inválido");
      }

      const payload = JSON.parse(
        Buffer.from(tokenPayload, "base64url").toString("utf8")
      );

      console.log("[ChargeGrid Auth] Comparação de projetos:", {
        projetoConfigurado: new URL(url).hostname,
        projetoDoToken: new URL(payload.iss).hostname,
      });
    } catch {
      console.log(
        "[ChargeGrid Auth] Não foi possível ler os metadados do token."
      );
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("[ChargeGrid Auth] Falha na validação:", {
        message: error?.message,
        status: error?.status,
        hasUser: Boolean(data.user),
      });

      return null;
    }

    return { supabase, userId: data.user.id };
  } catch (error) {
    console.error("[server-auth] falha ao identificar o usuário", error);
    return null;
  }
}

/** Igual ao getUserSession, mas lança um erro amigável se não houver login. */
export async function requireUserSession(
  accessToken?: string
): Promise<UserSession> {
  const session = await getUserSession(accessToken);

  if (!session) {
    throw new Error(
      "Sua sessão expirou. Entre novamente no ChargeGrid."
    );
  }

  return session;
}
