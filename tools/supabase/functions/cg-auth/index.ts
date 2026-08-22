import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedKey: { pem: string; at: number } | null = null;

async function fetchPublicKey(): Promise<string> {
  const now = Date.now();
  if (cachedKey !== null && now - cachedKey.at < 600000) {
    return cachedKey.pem;
  }
  const res = await fetch("https://sdk.crazygames.com/publicKey.json");
  const data = await res.json();
  if (!data || typeof data.publicKey !== "string") {
    throw new Error("bad_public_key");
  }
  cachedKey = { pem: data.publicKey, at: now };
  return data.publicKey;
}

function b64urlToBuffer(part: string): Buffer {
  return Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function verifyToken(token: string, pem: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("malformed");
  }
  const signed = parts[0] + "." + parts[1];
  const sig = b64urlToBuffer(parts[2]);
  const key = crypto.createPublicKey(pem);
  const ok = crypto.verify("RSA-SHA256", Buffer.from(signed), key, sig);
  if (!ok) {
    throw new Error("bad_signature");
  }
  const payload = JSON.parse(b64urlToBuffer(parts[1]).toString("utf8"));
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    throw new Error("expired");
  }
  return payload;
}

function json(bodyObj: unknown, status = 200): Response {
  return new Response(JSON.stringify(bodyObj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
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

    const pem = await fetchPublicKey();
    const payload = verifyToken(token, pem);
    const userId = payload.userId ? String(payload.userId) : "";
    const username = payload.username ? String(payload.username) : "";
    if (userId === "") {
      return json({ ok: false, error: "no_user_id" });
    }

    const email = "cg-" + userId.toLowerCase().replace(/[^a-z0-9]/g, "") + "@cg.highnoon.local";
    const password = crypto.createHmac("sha256", secret).update(userId).digest("hex");

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

    let signIn = await anon.auth.signInWithPassword({ email, password });
    let created = false;
    if (signIn.error) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { cg_user_id: userId, cg_username: username },
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

    return json({
      ok: true,
      userId,
      username,
      created,
      uid: signIn.data.user ? signIn.data.user.id : null,
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
    });
  } catch (err) {
    return json({ ok: false, error: String(err && (err as Error).message || err) });
  }
});
