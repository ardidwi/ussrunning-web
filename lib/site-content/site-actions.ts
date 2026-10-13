"use server";
import { AccountError } from '@/lib/auth/errors';
import { SiteError } from './site-errors';
import type { AccountErrorCode } from '@/lib/auth/errors';
import type { SiteCode } from './site-errors';
import * as service from './site-service';
type Result<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: SiteCode | AccountErrorCode;
};
async function result<T>(fn: () => Promise<T>): Promise<Result<T>> { try {
    return { ok: true, data: await fn() };
}
catch (e) {
    return { ok: false, code: e instanceof SiteError || e instanceof AccountError ? e.code : 'SITE_CONTENT_UNAVAILABLE' };
} }
export async function getManagedSiteContent(v: unknown) { return result(() => service.getManagedSiteContent(v)); }
export async function listManagedSiteContent(v: unknown) { return result(() => service.listManagedSiteContent(v)); }
export async function createSiteContentDraft(v: unknown) { return result(() => service.createSiteContentDraft(v)); }
export async function updateSiteContentDraft(v: unknown) { return result(() => service.updateSiteContentDraft(v)); }
export async function publishSiteContent(v: unknown) { return result(() => service.publishSiteContent(v)); }
export async function unpublishSiteContent(v: unknown) { return result(() => service.unpublishSiteContent(v)); }
export async function archiveSiteContent(v: unknown) { return result(() => service.archiveSiteContent(v)); }
export async function reorderHomepageSections(v: unknown) { return result(() => service.reorderHomepageSections(v)); }
export async function previewSiteContent(v: unknown) { return result(() => service.previewSiteContent(v)); }
export async function getPublicSiteBundle(v: unknown) { return result(() => service.getPublicSiteBundle(v)); }
