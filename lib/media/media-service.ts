import 'server-only';
import {randomUUID} from 'node:crypto';
import {requirePermission} from '@/lib/authz/guards';
import type {MediaCode} from './media-errors';
import {MediaError,mediaOperation} from './media-errors';
import {mediaPolicy} from './media-policy';
import {object,uuid,uploadInput,inspectImage,filters,metadataInput,archiveInput} from './media-validation';
import * as repository from './media-repository';
import {unconfiguredStorage} from './storage/storage-provider';
import type {StorageProvider} from './storage/storage-provider';
import type {MediaAsset,MediaRecord,MediaPage} from './media-types';
function check(code:string){if(code!=='OK')throw new MediaError(code as MediaCode);}
function safeUrl(value:string|null){if(!value)return null;try{const u=new URL(value);if(u.username||u.password||u.hash)return null;if(u.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))return null;return u.toString();}catch{return null;}}
async function present(storage:StorageProvider,record:MediaRecord):Promise<MediaAsset>{const {storageKey,storageProvider,publicUrl,...safe}=record;let url:string|null=null;try{url=safeUrl(storageProvider===storage.id?await storage.deliveryUrl(storageKey,record.visibility):record.visibility==='public'?publicUrl:null);}catch{/* Metadata remains usable; never invent a delivery URL or expose provider errors. */}return{...safe,url,deliveryAvailable:url!==null};}

/** Serialize repository-validated records without another DB lookup. */
export async function resolveMediaAsset(record:MediaRecord){return present(unconfiguredStorage,record);}
/** Internal DI boundary; clients cannot choose adapters or role authority. */
export function createMediaService(storage:StorageProvider){
 const actor=async()=>(await requirePermission('cms.content.manage')).account.id;
 return {
 uploadMedia:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=uploadInput(value),p=mediaPolicy(),id=randomUUID();check((await repository.reserveUpload(a,id,p.uploads,p.windowSeconds)).code);const image=await inspectImage(v.bytes,v.mimeType),key=`${p.prefix}/${id}.${image.extension}`;try{await storage.put(key,v.bytes,v.mimeType);}catch(e){if(e instanceof MediaError)throw e;throw new MediaError('MEDIA_UPLOAD_FAILED');}const r=await repository.createAsset(a,{id,key,provider:storage.id,mime:v.mimeType,bytes:v.bytes.byteLength,width:image.width,height:image.height,checksum:image.checksum,filename:v.filename,altText:v.altText,caption:v.caption,visibility:v.visibility});check(r.code);if(!r.data)throw new MediaError('MEDIA_UPLOAD_FAILED');return present(storage,r.data);}),
 getMediaAsset:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=object(value,['id']),r=await repository.readAsset(uuid(v.id),a);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 getPublicMediaAsset:(value:unknown)=>mediaOperation(async()=>{const v=object(value,['id']),r=await repository.readAsset(uuid(v.id));if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 listMediaAssets:(value:unknown={})=>mediaOperation(async():Promise<MediaPage>=>{const a=await actor(),f=filters(value),r=await repository.listAssets(a,f);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');const page=r.items.slice(0,f.limit),last=page.at(-1);return{items:await Promise.all(page.map(record=>present(storage,record))),nextCursor:r.items.length>f.limit&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last.id,scope:JSON.stringify([f.status,f.visibility])})).toString('base64url'):null};}),
 updateMediaMetadata:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=metadataInput(value),r=await repository.mutateAsset(a,v.id,v.version,v.patch);check(r.code);if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 softDeleteMedia:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=archiveInput(value),r=await repository.mutateAsset(a,v.id,v.version,null);check(r.code);if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);})
 };
}
// No deployed storage configured: metadata reads work; binary writes fail closed.
export const {uploadMedia,getMediaAsset,getPublicMediaAsset,listMediaAssets,updateMediaMetadata,softDeleteMedia}=createMediaService(unconfiguredStorage);
