import 'server-only';
import {randomUUID} from 'node:crypto';
import {requirePermission} from '@/lib/authz/guards';
import type {MediaCode} from './media-errors';
import {MediaError,mediaOperation} from './media-errors';
import {mediaPolicy} from './media-policy';
import {object,uuid,uploadInput,inspectImage,filters,metadataInput,archiveInput,cursorScope,uploadRequestInput,finalizeInput,usageInput} from './media-validation';
import * as uploads from './media-upload-repository';
import * as repository from './media-repository';
import {unconfiguredStorage} from './storage/storage-provider';
import {createConfiguredStorage} from './storage/neon-s3-provider';
import type {StorageProvider} from './storage/storage-provider';
import type {MediaAsset,MediaRecord,MediaPage,MediaLibraryPage,MediaUploadTicket,MediaUsage} from './media-types';
/** Presigned PUT lifetime; the intent stays finalisable a little longer so a slow upload can complete. */
export const UPLOAD_URL_SECONDS=600,UPLOAD_INTENT_SECONDS=900;
function check(code:string){if(code!=='OK')throw new MediaError(code as MediaCode);}
function safeUrl(value:string|null){if(!value)return null;try{const u=new URL(value);if(u.username||u.password||u.hash)return null;if(u.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))return null;return u.toString();}catch{return null;}}
const deployedStorage=createConfiguredStorage()??unconfiguredStorage;
async function present(storage:StorageProvider,record:MediaRecord):Promise<MediaAsset>{const {storageKey,storageProvider,publicUrl,purpose,...safe}=record;let url:string|null=null;
 // Defense in depth: member avatars are signed only by lib/member/avatar-storage.ts; anything not provably CMS media gets no URL.
 if(purpose!=='cms'||storageKey.startsWith('member-avatars/'))return{...safe,url:null,deliveryAvailable:false};
 try{url=safeUrl(storageProvider===storage.id?await storage.deliveryUrl(storageKey,record.visibility):record.visibility==='public'?publicUrl:null);}catch{/* Metadata remains usable; never invent a delivery URL or expose provider errors. */}return{...safe,url,deliveryAvailable:url!==null};}

/** Serialize repository-validated records without another DB lookup. */
export async function resolveMediaAsset(record:MediaRecord){return present(deployedStorage,record);}
/** Internal DI boundary; clients cannot choose adapters, buckets or role authority. */
export function createMediaService(storage:StorageProvider){
 const actor=async()=>(await requirePermission('cms.content.manage')).account.id;
 const finalized=async(a:string,id:string)=>{const r=await repository.readAsset(id,a);if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);};
 return {
 uploadMedia:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=uploadInput(value),p=mediaPolicy(),id=randomUUID();check((await repository.reserveUpload(a,id,p.uploads,p.windowSeconds)).code);const image=await inspectImage(v.bytes,v.mimeType),key=`${p.prefix}/${id}.${image.extension}`;try{await storage.put(key,v.bytes,v.mimeType,v.visibility);}catch(e){if(e instanceof MediaError)throw e;throw new MediaError('MEDIA_UPLOAD_FAILED');}const r=await repository.createAsset(a,{id,key,provider:storage.id,mime:v.mimeType,bytes:v.bytes.byteLength,width:image.width,height:image.height,checksum:image.checksum,filename:v.filename,altText:v.altText,caption:v.caption,visibility:v.visibility});check(r.code);if(!r.data)throw new MediaError('MEDIA_UPLOAD_FAILED');return present(storage,r.data);}),
 getMediaAsset:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=object(value,['id']),r=await repository.readAsset(uuid(v.id),a);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 getPublicMediaAsset:(value:unknown)=>mediaOperation(async()=>{const v=object(value,['id']),r=await repository.readAsset(uuid(v.id));if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 listMediaAssets:(value:unknown={})=>mediaOperation(async():Promise<MediaPage>=>{const a=await actor(),f=filters(value),r=await repository.listAssets(a,f);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');const page=r.items.slice(0,f.limit),last=page.at(-1);return{items:await Promise.all(page.map(record=>present(storage,record))),nextCursor:r.items.length>f.limit&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last.id,scope:cursorScope(f)})).toString('base64url'):null};}),
 /** Library grid: one page query plus one bounded usage query for the whole page. */
 listMediaLibrary:(value:unknown={})=>mediaOperation(async():Promise<MediaLibraryPage>=>{const a=await actor(),f=filters(value),r=await repository.listAssets(a,f);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');const page=r.items.slice(0,f.limit),last=page.at(-1);const usage=page.length?await repository.mediaUsage(a,page.map(x=>x.id)):{authorized:true,usage:[]};if(!usage.authorized)throw new MediaError('MEDIA_FORBIDDEN');const counts=new Map<string,number>();for(const u of usage.usage)counts.set(u.mediaId,(counts.get(u.mediaId)??0)+1);return{items:await Promise.all(page.map(async record=>({...(await present(storage,record)),usageCount:counts.get(record.id)??0}))),nextCursor:r.items.length>f.limit&&last?Buffer.from(JSON.stringify({createdAt:last.createdAt,id:last.id,scope:cursorScope(f)})).toString('base64url'):null};}),
 getMediaUsage:(value:unknown)=>mediaOperation(async():Promise<MediaUsage[]>=>{const a=await actor(),v=usageInput(value),r=await repository.mediaUsage(a,[v.id]);if(!r.authorized)throw new MediaError('MEDIA_FORBIDDEN');return r.usage.map(({mediaId:_m,...u})=>u);}),
 /** D3.1 step 1: validate declared metadata, rate limit, record an intent and return a short-lived PUT URL. */
 requestMediaUpload:(value:unknown)=>mediaOperation(async():Promise<MediaUploadTicket>=>{const a=await actor(),v=uploadRequestInput(value),p=mediaPolicy();if(!storage.presignPut||!storage.readObject||!storage.deleteObject)throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');const id=randomUUID(),key=`${p.prefix}/${id}.${{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[v.mimeType]}`;
  const r=await uploads.createIntent(a,{id,key,provider:storage.id,mime:v.mimeType,bytes:v.sizeBytes,filename:v.filename,altText:v.altText,caption:v.caption,visibility:v.visibility,ttlSeconds:UPLOAD_INTENT_SECONDS},p.uploads,p.windowSeconds);check(r.code);
  let signed;try{signed=await storage.presignPut(key,v.mimeType,v.sizeBytes,v.visibility,UPLOAD_URL_SECONDS);}catch(e){if(e instanceof MediaError)throw e;throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');}
  return{uploadId:id,uploadUrl:signed.url,method:'PUT',headers:signed.headers,expiresAt:r.expiresAt!,maxBytes:p.maxBytes};}),
 /** D3.1 step 2: re-validate what storage actually holds; mismatches are rejected and the object deleted. */
 finalizeMediaUpload:(value:unknown)=>mediaOperation(async():Promise<MediaAsset>=>{const a=await actor(),v=finalizeInput(value),p=mediaPolicy(),row=await uploads.readIntent(a,v.uploadId);if(!row.authorized)throw new MediaError('MEDIA_FORBIDDEN');const intent=row.data;if(!intent)throw new MediaError('MEDIA_NOT_FOUND');
  if(intent.status==='finalized')return finalized(a,intent.id);if(intent.status!=='pending')throw new MediaError('MEDIA_CONFLICT');
  if(!storage.readObject||!storage.deleteObject||intent.storageProvider!==storage.id)throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');
  const reject=async(code:MediaCode):Promise<never>=>{try{await storage.deleteObject!(intent.storageKey,intent.visibility);}catch{/* Orphan left for the audited cleanup script; never surface provider errors. */}await uploads.rejectIntent(a,intent.id,code);throw new MediaError(code);};
  if(intent.expired)return reject('MEDIA_UPLOAD_EXPIRED');
  let stored;try{stored=await storage.readObject(intent.storageKey,intent.visibility,p.maxBytes);}catch(e){if(e instanceof MediaError)throw e;throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');}
  if(!stored)throw new MediaError('MEDIA_UPLOAD_INCOMPLETE');
  if(!stored.bytes||stored.size>p.maxBytes)return reject('MEDIA_TOO_LARGE');
  if(stored.bytes.byteLength!==intent.declaredBytes)return reject('MEDIA_INVALID_CONTENT');
  let image;try{image=await inspectImage(stored.bytes,intent.mimeType);}catch(e){return reject(e instanceof MediaError?e.code:'MEDIA_INVALID_CONTENT');}
  const r=await uploads.finalizeIntent(a,intent.id,{bytes:stored.bytes.byteLength,width:image.width,height:image.height,checksum:image.checksum});check(r.code);if(r.already)return finalized(a,intent.id);if(!r.data)throw new MediaError('MEDIA_UPLOAD_FAILED');return present(storage,r.data);}),
 updateMediaMetadata:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=metadataInput(value),r=await repository.mutateAsset(a,v.id,v.version,v.patch);check(r.code);if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);}),
 softDeleteMedia:(value:unknown)=>mediaOperation(async()=>{const a=await actor(),v=archiveInput(value),r=await repository.mutateAsset(a,v.id,v.version,null);check(r.code);if(!r.data)throw new MediaError('MEDIA_NOT_FOUND');return present(storage,r.data);})
 };
}
export const {uploadMedia,getMediaAsset,getPublicMediaAsset,listMediaAssets,listMediaLibrary,getMediaUsage,requestMediaUpload,finalizeMediaUpload,updateMediaMetadata,softDeleteMedia}=createMediaService(deployedStorage);
