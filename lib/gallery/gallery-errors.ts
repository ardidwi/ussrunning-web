import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
export type GalleryCode = 'GALLERY_NOT_FOUND' | 'GALLERY_FORBIDDEN' | 'GALLERY_CONFLICT' | 'GALLERY_SLUG_TAKEN' | 'GALLERY_INVALID_STATE' | 'GALLERY_INVALID_CONTENT' | 'GALLERY_INVALID_INPUT' | 'GALLERY_MEDIA_INVALID' | 'GALLERY_INVALID_REFERENCE' | 'GALLERY_NOT_PUBLISHABLE' | 'GALLERY_UNAVAILABLE' | 'GALLERY_ITEM_NOT_FOUND' | 'GALLERY_ORDER_CONFLICT';
export class GalleryError extends Error {
    constructor(public readonly code: GalleryCode) { super(code); }
}
export async function galleryOperation<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    }
    catch (e) {
        if (e instanceof GalleryError || e instanceof AccountError)
            throw e;
        if (e instanceof AuthorizationError)
            throw new GalleryError(e.code === 'INSUFFICIENT_PERMISSION' ? 'GALLERY_FORBIDDEN' : 'GALLERY_UNAVAILABLE');
        if (e && typeof e === 'object' && 'code' in e && e.code === '23505')
            throw new GalleryError('GALLERY_SLUG_TAKEN');
        throw new GalleryError('GALLERY_UNAVAILABLE');
    }
}
