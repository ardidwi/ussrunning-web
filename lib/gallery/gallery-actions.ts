"use server";
import * as service from './gallery-service';
import { GalleryError } from './gallery-errors';
import { AccountError } from '@/lib/auth/errors';
import type { GalleryCode } from './gallery-errors';
import type { AccountErrorCode } from '@/lib/auth/errors';
export type GalleryResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: GalleryCode | AccountErrorCode;
};
async function run<T>(fn: () => Promise<T>): Promise<GalleryResult<T>> {
    try {
        return { ok: true, data: await fn() };
    }
    catch (e) {
        return { ok: false, code: e instanceof GalleryError || e instanceof AccountError ? e.code : 'GALLERY_UNAVAILABLE' };
    }
}
export async function createGallery(value: unknown) { return run(() => service.createGallery(value)); }
export async function updateGallery(value: unknown) { return run(() => service.updateGallery(value)); }
export async function publishGallery(value: unknown) { return run(() => service.publishGallery(value)); }
export async function unpublishGallery(value: unknown) { return run(() => service.unpublishGallery(value)); }
export async function archiveGallery(value: unknown) { return run(() => service.archiveGallery(value)); }
export async function getManagedGallery(value: unknown) { return run(() => service.getManagedGallery(value)); }
export async function getPublicGalleryBySlug(value: unknown) { return run(() => service.getPublicGalleryBySlug(value)); }
export async function addGalleryItem(value: unknown) { return run(() => service.addGalleryItem(value)); }
export async function updateGalleryItem(value: unknown) { return run(() => service.updateGalleryItem(value)); }
export async function removeGalleryItem(value: unknown) { return run(() => service.removeGalleryItem(value)); }
export async function reorderGalleryItems(value: unknown) { return run(() => service.reorderGalleryItems(value)); }
export async function listManagedGalleryItems(value: unknown) { return run(() => service.listManagedGalleryItems(value)); }
export async function listPublicGalleryItems(value: unknown) { return run(() => service.listPublicGalleryItems(value)); }
export async function listManagedGalleries(value: unknown = {}) { return run(() => service.listManagedGalleries(value)); }
export async function listPublicGalleries(value: unknown = {}) { return run(() => service.listPublicGalleries(value)); }
export async function listGalleryRevisions(value: unknown) { return run(() => service.listGalleryRevisions(value)); }
