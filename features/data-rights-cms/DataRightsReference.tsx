"use client";
import { useState } from "react";
import { DataRightsSettings, type DataRightsAdapters } from "@/features/member-dashboard/components/DataRightsSettings";
import { DataRightsQueue } from "./DataRightsQueue";
import type { AdminDeletionRequestDTO, DataRightsResult, DeletionRequestDTO, OwnDeletionStatus } from "@/lib/data-rights/data-rights-types";

/** Development-only visual fixture (fictional data, no network). Mirrors server contracts. */
const EMAIL = "runner@fixture.invalid";
const wait = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));
const base: DeletionRequestDTO = {
  id: "22222222-2222-4222-8222-222222222222", status: "pending", reason: "Moving abroad and no longer running with the crew.",
  requestedAt: "2026-11-26T03:15:00.000000Z", decidedAt: null, decisionReason: null, cancelledAt: null, executedAt: null, version: 1,
};
function memberAdapters(mode: string): DataRightsAdapters {
  let current: DeletionRequestDTO | null = mode === "pending" ? base : mode === "rejected"
    ? { ...base, status: "rejected", decidedAt: "2026-11-26T08:00:00.000000Z", decisionReason: "Please settle the open jersey order first, then request again.", version: 2 } : null;
  return {
    async exportData() {
      await wait();
      if (mode === "error") return { ok: false, code: "DATA_RIGHTS_RATE_LIMITED" };
      return { ok: true, filename: "uss-running-data-2026-11-27.json", blob: new Blob([JSON.stringify({ fixture: true })], { type: "application/json" }) };
    },
    async status() { await wait(200); return { ok: true, data: { current, canRequest: !current || !["pending", "approved"].includes(current.status) } }; },
    async request(input) {
      await wait();
      if (input.confirmEmail.toLowerCase() !== EMAIL) return { ok: false, code: "DATA_RIGHTS_CONFIRMATION_MISMATCH" };
      current = { ...base, reason: input.reason ?? null, requestedAt: new Date().toISOString() };
      return { ok: true, data: current };
    },
    async cancel() {
      await wait();
      current = { ...current!, status: "cancelled", cancelledAt: new Date().toISOString(), version: current!.version + 1 };
      return { ok: true, data: current };
    },
  };
}
const subject = (n: number, name: string) => ({ accountId: `3333333${n}-3333-4333-8333-333333333333`, memberId: `USS-00012${n}`, displayName: name, email: `runner${n}@fixture.invalid`, accountStatus: "active" as const });
const queue: AdminDeletionRequestDTO[] = [
  { ...base, subject: subject(1, "Synthetic Runner"), decidedBy: null, executedBy: null, erasure: null },
  { ...base, id: "44444444-4444-4444-8444-444444444444", status: "approved", reason: null, decidedAt: "2026-11-26T09:00:00.000000Z",
    decisionReason: "Identity confirmed by email.", version: 2, subject: subject(2, "Another Fictional Member With A Very Long Display Name"),
    decidedBy: { accountId: "x", displayName: "Fixture Super Admin" }, executedBy: null, erasure: null },
  { ...base, id: "55555555-5555-4555-8555-555555555555", status: "executed", reason: null, decidedAt: "2026-11-25T09:00:00.000000Z",
    decisionReason: "Verified request.", executedAt: "2026-11-25T10:00:00.000000Z", version: 3,
    subject: { ...subject(3, ""), displayName: null, email: "deleted-33333333-3333-4333-8333-333333333333@erased.invalid", accountStatus: "deactivated" },
    decidedBy: { accountId: "x", displayName: "Fixture Super Admin" }, executedBy: { accountId: "x", displayName: "Fixture Super Admin" },
    erasure: { summary: { rolesRemoved: 1, passesRevoked: 2, profilesErased: 1, avatarObjectsQueued: 1, registrationsCancelled: 1, registrationAnswersErased: 3, notificationsRedacted: 4 }, pendingObjects: 1, deletedObjects: 0 } },
];

export function DataRightsReference({ surface }: { surface: string | undefined }) {
  const [adapters] = useState(() => memberAdapters(surface ?? ""));
  if (process.env.NODE_ENV !== "development") return null;
  if (surface === "admin" || surface === "admin-empty" || surface === "admin-error") {
    const result: DataRightsResult<{ items: AdminDeletionRequestDTO[]; nextCursor: string | null }> = surface === "admin-error"
      ? { ok: false, code: "DATA_RIGHTS_UNAVAILABLE" } : { ok: true, data: { items: surface === "admin" ? queue : [], nextCursor: null } };
    return <DataRightsQueue result={result} status="" cursor="" adapters={{
      decide: async input => { await wait(); return { ok: true, data: { ...base, status: input.decision === "approve" ? "approved" : "rejected", decisionReason: input.reason, decidedAt: new Date().toISOString(), version: 2 } }; },
      execute: async () => { await wait(); return { ok: true, data: { request: { ...base, status: "executed", version: 3 }, alreadyExecuted: false, objects: { deleted: 1, pending: 0 }, sessions: "unavailable" } }; },
      refresh: () => {},
    }} />;
  }
  const initial: DataRightsResult<OwnDeletionStatus> = surface === "status-error" ? { ok: false, code: "DATA_RIGHTS_UNAVAILABLE" }
    : { ok: true, data: { current: surface === "pending" ? base : surface === "rejected" ? { ...base, status: "rejected", decidedAt: "2026-11-26T08:00:00.000000Z", decisionReason: "Please settle the open jersey order first, then request again.", version: 2 } : null,
      canRequest: surface !== "pending" } };
  return (
    <>
      <p className="uss-member-kicker">MY USS / SETTINGS</p>
      <h1>SETTINGS.</h1>
      <p className="uss-dashboard-note">Your contact details live in Profile. Here you can take a copy of your data or ask us to delete your account.</p>
      <DataRightsSettings initial={initial} adapters={adapters} />
    </>
  );
}
