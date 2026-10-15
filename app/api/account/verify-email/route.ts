import { randomBytes } from "node:crypto";
import { verifyEmailProof } from "@/lib/auth/email-verification";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY" };
/** Non-mutating GET, explicit POST: link scanners cannot activate accounts. */
export async function GET() {
  const nonce = randomBytes(18).toString("base64");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>USS Running — Verify email</title><h1>USS Running</h1><p>Confirm your email to activate your USS account.</p><form method="post" action="/api/account/verify-email"><input type="hidden" name="token" id="token"><button id="verify" disabled>Verify email</button></form><p id="notice">Open the complete link from your verification email.</p><noscript>JavaScript is needed to read the verification link safely.</noscript><script nonce="${nonce}">const params=new URLSearchParams(location.hash.slice(1));const token=params.get('token');history.replaceState(null,'',location.pathname);if(token&&/^[A-Za-z0-9_-]{43}$/.test(token)){document.getElementById('token').value=token;document.getElementById('verify').disabled=false;document.getElementById('notice').textContent='This link can be used once.';location.replace('/login?flow=verify#'+new URLSearchParams({token}).toString());}</script></html>`;
  return new Response(html, { headers: { ...headers, "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'` } });
}
export async function POST(request: Request) {
  let token: unknown;
  try {
    // Bounded body before parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 2048) { await reader.cancel(); throw new Error(); } chunks.push(value); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const body = new TextDecoder().decode(bytes);
    const type = request.headers.get("content-type")?.split(";")[0];
    if (type === "application/json") { const parsed = JSON.parse(body); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.keys(parsed).some(key => key !== "token")) throw new Error(); token = parsed.token; }
    else if (type === "application/x-www-form-urlencoded") { const parsed = new URLSearchParams(body); if ([...parsed.keys()].some(key => key !== "token") || parsed.getAll("token").length !== 1) throw new Error(); token = parsed.get("token"); }
    else throw new Error();
  } catch { return Response.json({ ok: false, code: "VERIFICATION_INVALID" }, { status: 400, headers }); }
  const result = await verifyEmailProof(token);
  return Response.json(result, { status: result.code === "VERIFICATION_UNAVAILABLE" ? 503 : result.ok ? 200 : 400, headers });
}
