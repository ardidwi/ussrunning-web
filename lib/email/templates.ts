import "server-only";
import type { EmailContent } from "./types";
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
/** Security-sensitive template is code-owned, never editable through CMS. */
export function verificationEmail(url: string, ttlMinutes: number): EmailContent {
  const subject = "Verify your USS Running account";
  const text = `USS Running\n\nVerify your email to activate your USS account.\n\nVerify email: ${url}\n\nThis link expires in ${ttlMinutes} minutes and can be used once.\nIf you did not request this account, ignore this email. Never share your verification link.`;
  return { subject, text, html: `<!doctype html><html lang="en"><body><h1>USS Running</h1><h2>Verify your email</h2><p>Activate your USS account and keep moving with the crew.</p><p><a href="${escape(url)}">Verify email</a></p><p>This link expires in ${ttlMinutes} minutes and can be used once.</p><p>If the button does not work, copy this link into your browser:</p><p>${escape(url)}</p><p>If you did not request this account, ignore this email. Never share your verification link.</p></body></html>` };
}
