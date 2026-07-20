import crypto from "node:crypto";
import { Buffer } from "node:buffer";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const token = body && typeof body.token === "string" ? body.token : "";
    if (token === "") {
      return new Response(JSON.stringify({ ok: false, error: "no_token" }), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const pem = await fetchPublicKey();
    const payload = verifyToken(token, pem);
    return new Response(
      JSON.stringify({
        ok: true,
        userId: payload.userId ?? null,
        username: payload.username ?? null,
        gameId: payload.gameId ?? null,
        exp: payload.exp ?? null,
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err && (err as Error).message || err) }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
