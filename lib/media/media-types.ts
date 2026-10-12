export type MediaMime = 'image/jpeg'|'image/png'|'image/webp';
export type MediaVisibility = 'private'|'public';
export type MediaAsset = {id:string;url:string|null;deliveryAvailable:boolean;mimeType:string;sizeBytes:number;width:number|null;height:number|null;altText:string|null;caption:string|null;status:'active'|'archived';visibility:MediaVisibility;version:number;createdAt:string;updatedAt:string};
export type MediaRecord = Omit<MediaAsset,'url'|'deliveryAvailable'> & {storageKey:string;storageProvider:string;publicUrl:string|null};
export type MediaUpload = {bytes:Uint8Array;mimeType:MediaMime;filename:string;altText?:string|null;caption?:string|null;visibility?:MediaVisibility};
export type MediaPage = {items:MediaAsset[];nextCursor:string|null};
