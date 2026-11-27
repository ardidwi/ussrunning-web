"use server";
import { dataRightsResult } from "./data-rights-errors";
import * as service from "./data-rights-service";

/** Member self-service. Identity is the trusted session; inputs never carry account ids. */
export async function getOwnDeletionStatus() { return dataRightsResult(() => service.getOwnDeletionStatus()); }
export async function requestOwnDeletion(input: unknown) { return dataRightsResult(() => service.requestOwnDeletion(input)); }
export async function cancelOwnDeletion(input: unknown) { return dataRightsResult(() => service.cancelOwnDeletion(input)); }

/** Super-admin queue (DATA_RIGHTS_PERMISSIONS.manage + DB super_admin check). */
export async function listDeletionRequests(input: unknown = {}) { return dataRightsResult(() => service.listDeletionRequests(input)); }
export async function decideDeletionRequest(input: unknown) { return dataRightsResult(() => service.decideDeletionRequest(input)); }
export async function executeDeletionRequest(input: unknown) { return dataRightsResult(() => service.executeDeletionRequest(input)); }
