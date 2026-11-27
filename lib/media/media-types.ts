export type MediaMime = 'image/jpeg'|'image/png'|'image/webp';
export type MediaVisibility = 'private'|'public';
export type MediaAsset = {id:string;url:string|null;deliveryAvailable:boolean;mimeType:string;sizeBytes:number;width:number|null;height:number|null;altText:string|null;caption:string|null;status:'active'|'archived';visibility:MediaVisibility;version:number;createdAt:string;updatedAt:string};
export type MediaPurpose = 'cms'|'member_avatar';
export type MediaRecord = Omit<MediaAsset,'url'|'deliveryAvailable'> & {storageKey:string;storageProvider:string;publicUrl:string|null;purpose:MediaPurpose};
export type MediaUpload = {bytes:Uint8Array;mimeType:MediaMime;filename:string;altText?:string|null;caption?:string|null;visibility?:MediaVisibility};
export type MediaPage = {items:MediaAsset[];nextCursor:string|null};
/** Where a CMS asset is referenced. Labels are editorial titles, never storage keys or account data. */
export type MediaUsageKind = 'story'|'gallery'|'event'|'partner'|'site_content';
export type MediaUsage = {kind:MediaUsageKind;role:string;entityId:string;label:string;status:string|null};
export type MediaLibraryItem = MediaAsset & {usageCount:number};
export type MediaLibraryPage = {items:MediaLibraryItem[];nextCursor:string|null};
export type MediaUploadTicket = {uploadId:string;uploadUrl:string;method:'PUT';headers:Record<string,string>;expiresAt:string;maxBytes:number};
