import 'server-only';
import {MediaError} from '../media-errors';
import type {MediaMime,MediaVisibility} from '../media-types';
/** Server-owned adapters only. put must create-if-absent, use supplied Content-Type,
 * never overwrite an existing key. Visibility selects the server-owned bucket; clients never
 * provide provider credentials or bucket names. Private URLs must be short-lived and generated
 * on read. No physical delete API: cleanup requires a separate approved reference audit. */
export interface StorageProvider {
 readonly id:string;
 put(key:string,bytes:Uint8Array,mime:MediaMime,visibility:MediaVisibility):Promise<void>;
 deliveryUrl(key:string,visibility:MediaVisibility):Promise<string|null>;
}
export const unconfiguredStorage:StorageProvider={id:'unconfigured',async put(){throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');},async deliveryUrl(){return null;}};
