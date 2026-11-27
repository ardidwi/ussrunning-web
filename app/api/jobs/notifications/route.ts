import { authorizeJobRequest } from "@/lib/notifications/job-auth";
import { runNotificationJob } from "@/lib/notifications/notification-job";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

/**
 * D2.6 notification delivery job, invoked by Vercel Cron (GET, every 5 minutes; see vercel.json).
 * Authentication happens before any database or provider access; a rejected request has no side effects.
 */
async function handle(request: Request) {
  const auth = authorizeJobRequest(request.headers.get("authorization"));
  if (auth === "NOT_CONFIGURED")
    return Response.json({ ok: false, code: "JOB_NOT_CONFIGURED" }, { status: 503, headers });
  if (auth !== "AUTHORIZED")
    return Response.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401, headers: { ...headers, "WWW-Authenticate": "Bearer" } });
  try {
    const report = await runNotificationJob();
    const status = report.code === "NOTIFICATION_PROVIDER_UNAVAILABLE" ? 503 : 200;
    console.info(JSON.stringify({ scope: "notification-job", ...report }));
    return Response.json({ ok: status === 200, ...report }, { status, headers });
  } catch {
    console.error(JSON.stringify({ scope: "notification-job", code: "NOTIFICATION_JOB_FAILED" }));
    return Response.json({ ok: false, code: "NOTIFICATION_JOB_FAILED" }, { status: 500, headers });
  }
}

export const GET = handle;
export const POST = handle;
