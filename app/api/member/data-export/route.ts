import { exportOwnData } from "@/lib/data-rights/data-rights-service";
import { dataRightsResult } from "@/lib/data-rights/data-rights-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401, EMAIL_NOT_VERIFIED: 403, ACCOUNT_SUSPENDED: 403, ACCOUNT_DEACTIVATED: 403,
  ACCOUNT_NOT_PROVISIONED: 403, DATA_RIGHTS_FORBIDDEN: 403, DATA_RIGHTS_RATE_LIMITED: 429,
};

/** POST only (no link/prefetch-triggered exports) and same-origin only. Body is ignored. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(request.url).origin) || (site && site !== "same-origin")) {
    return Response.json({ ok: false, code: "DATA_RIGHTS_FORBIDDEN" }, { status: 403, headers });
  }
  const result = await dataRightsResult(() => exportOwnData());
  if (!result.ok) {
    return Response.json(result, { status: STATUS[result.code] ?? 503, headers: {
      ...headers, ...(result.code === "DATA_RIGHTS_RATE_LIMITED" ? { "Retry-After": "3600" } : {}) } });
  }
  return new Response(JSON.stringify(result.data.data, null, 2), { headers: {
    ...headers, "Content-Type": "application/json; charset=utf-8",
    "Content-Disposition": `attachment; filename="${result.data.filename}"`,
  } });
}
