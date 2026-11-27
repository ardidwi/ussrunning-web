import 'server-only';
import {MediaError} from '../media-errors';
import type {MediaMime,MediaVisibility} from '../media-types';
/** Server-owned adapters only. put must create-if-absent, use supplied Content-Type,
 * never overwrite an existing key. Visibility selects the server-owned bucket; clients never
 * provide provider credentials or bucket names. Private URLs must be short-lived and generated
 * on read.
 *
 * Direct uploads (D3.1): presignPut returns a short-lived single-object PUT URL for a server-chosen
 * key. readObject lets the server re-validate what was actually stored. deleteObject exists only to
 * discard an upload that failed finalisation (no media_assets row ever pointed at it); any other
 * physical cleanup goes through the dry-run-first audited script in scripts/media. */
export type StoredObject={size:number;bytes:Uint8Array|null};
export interface StorageProvider {
 readonly id:string;
 put(key:string,bytes:Uint8Array,mime:MediaMime,visibility:MediaVisibility):Promise<void>;
 getPrivate?(key:string):Promise<Uint8Array>;
 deliveryUrl(key:string,visibility:MediaVisibility):Promise<string|null>;
 presignPut?(key:string,mime:MediaMime,bytes:number,visibility:MediaVisibility,expiresSeconds:number):Promise<{url:string;headers:Record<string,string>}>;
 /** Missing object -> null. bytes is null when the stored size exceeds maxBytes (never buffered). */
 readObject?(key:string,visibility:MediaVisibility,maxBytes:number):Promise<StoredObject|null>;
 deleteObject?(key:string,visibility:MediaVisibility):Promise<void>;
}
export const unconfiguredStorage:StorageProvider={id:'unconfigured',async put(){throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');},async deliveryUrl(){return null;}};
