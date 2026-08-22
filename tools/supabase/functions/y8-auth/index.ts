import crypto from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROFILE_URL = "https://account.y8.com/api/profile";

function json(bodyObj: unknown, status = 200): Response {
  return new Response(JSON.stringify(bodyObj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function pick(source: unknown, keys: string[]): string {
  if (source === null || typeof source !== "object") {
    return "";
  }
  const row = source as Record<string, unknown>;
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value !== "") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function findUser(payload: unknown): { pid: string; nickname: string } {
  const roots: unknown[] = [payload];
  if (payload !== null && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    roots.push(row.user, row.profile, row.details, row.data);
    const auth = row.authResponse;
    if (auth !== null && typeof auth === "object") {
      roots.push(auth, (auth as Record<string, unknown>).details);
    }
  }
  for (const root of roots) {
    const pid = pick(root, ["pid", "id", "user_id", "userId"]);
    if (pid !== "") {
      return { pid, nickname: pick(root, ["nickname", "nick", "username", "first_name", "name"]) };
    }
  }
  return { pid: "", nickname: "" };
}

async function fetchY8Profile(token: string): Promise<unknown> {
  const value = token.toLowerCase().startsWith("bearer ") ? token : "Bearer " + token;
  const res = await fetch(PROFILE_URL, {
    headers: { Accept: "application/json", Authorization: value },
  });
  if (!res.ok) {
    throw new Error("y8_http_" + res.status);
  }
  return await res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const secret = Deno.env.get("CG_LINK_SECRET") ?? "";
    if (url === "" || serviceKey === "" || anonKey === "" || secret === "") {
      return json({ ok: false, error: "server_misconfigured" });
    }

    const body = await req.json().catch(() => ({}));
    const token = body && typeof body.token === "string" ? body.token : "";
    if (token === "") {
      return json({ ok: false, error: "no_token" });
    }

    const payload = await fetchY8Profile(token);
    const { pid, nickname } = findUser(payload);
    if (pid === "") {
      return json({ ok: false, error: "no_pid" });
    }

    const email = "y8-" + pid.toLowerCase().replace(/[^a-z0-9]/g, "") + "@y8.highnoon.local";
    const password = crypto.createHmac("sha256", secret).update("y8:" + pid).digest("hex");

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

    let signIn = await anon.auth.signInWithPassword({ email, password });
    let created = false;
    if (signIn.error) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { y8_pid: pid, y8_nickname: nickname },
      });
      if (createErr && String(createErr.message || "").indexOf("already") === -1) {
        return json({ ok: false, error: "create_failed: " + createErr.message });
      }
      created = true;
      signIn = await anon.auth.signInWithPassword({ email, password });
    }
    if (signIn.error || signIn.data.session === null) {
      return json({ ok: false, error: "signin_failed: " + (signIn.error ? signIn.error.message : "no_session") });
    }

    if (!created && signIn.data.user !== null && nickname !== "") {
      await admin.auth.admin.updateUserById(signIn.data.user.id, {
        user_metadata: { y8_pid: pid, y8_nickname: nickname },
      }).catch(() => {});
    }

    return json({
      ok: true,
      pid,
      nickname,
      created,
      uid: signIn.data.user ? signIn.data.user.id : null,
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
    });
  } catch (err) {
    return json({ ok: false, error: String(err && (err as Error).message || err) });
  }
});
