import 'server-only';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {MediaError} from './media-errors';
import {MEDIA_MIMES,MEDIA_PAGE_MAX,mediaPolicy} from './media-policy';
import type {MediaMime,MediaVisibility} from './media-types';
export function invalid():never{throw new MediaError('MEDIA_VALIDATION_ERROR');}
export function object(value:unknown,keys:readonly string[]){if(!value||typeof value!=='object'||Array.isArray(value))invalid();const v=value as Record<string,unknown>;if(Object.keys(v).some(k=>!keys.includes(k)))invalid();return v;}
export function uuid(value:unknown){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))invalid();return value;}
export function text(value:unknown,max:number):string|null{if(value==null||value==='')return null;if(typeof value!=='string'||value.length>max||/[<>\x00-\x1f]/.test(value))invalid();return value.trim()||null;}
export function visibility(value:unknown):MediaVisibility{if(value!==undefined&&value!=='public'&&value!=='private')invalid();return (value??'private') as MediaVisibility;}
export function uploadInput(value:unknown){const v=object(value,['bytes','mimeType','filename','altText','caption','visibility']),policy=mediaPolicy();if(!(v.bytes instanceof Uint8Array)||!v.bytes.byteLength)throw new MediaError('MEDIA_INVALID_CONTENT');if(v.bytes.byteLength>policy.maxBytes)throw new MediaError('MEDIA_TOO_LARGE');if(!MEDIA_MIMES.includes(v.mimeType as MediaMime))throw new MediaError('MEDIA_UNSUPPORTED_TYPE');const filename=text(v.filename,255);if(!filename||/[\/\\]/.test(filename)||filename.includes('..'))invalid();return{bytes:Uint8Array.from(v.bytes),mimeType:v.mimeType as MediaMime,filename,altText:text(v.altText,512),caption:text(v.caption,2000),visibility:visibility(v.visibility)};}
export async function inspectImage(bytes:Uint8Array,claimed:MediaMime){
 const p=mediaPolicy(),b=Buffer.from(bytes),head=b.subarray(0,12);
 const detected=head.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':head[0]===255&&head[1]===216&&head[2]===255?'image/jpeg':head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP'?'image/webp':null;
 if(detected!==claimed)throw new MediaError('MEDIA_INVALID_CONTENT');
 try{const image=sharp(b,{failOn:'warning',limitInputPixels:p.maxPixels}),m=await image.metadata();if(!m.width||!m.height||m.width>p.maxDimension||m.height>p.maxDimension||m.width*m.height>p.maxPixels)throw new MediaError('MEDIA_INVALID_DIMENSIONS');if((m.pages??1)!==1)throw new MediaError('MEDIA_INVALID_CONTENT');const actual={jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[m.format as 'jpeg'|'png'|'webp'];if(actual!==claimed)throw new MediaError('MEDIA_INVALID_CONTENT');await image.raw().toBuffer();return{width:m.width,height:m.height,checksum:createHash('sha256').update(b).digest('hex'),extension:{'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[claimed]};}catch(e){if(e instanceof MediaError)throw e;throw new MediaError('MEDIA_INVALID_CONTENT');}
}
export type LibraryFilter={status:'active'|'archived';visibility:MediaVisibility|null;limit:number;cursor:{createdAt:string;id:string}|null;q:string|null;mime:MediaMime|null};
/** Escapes LIKE wildcards so a search term is always matched literally. */
export function searchPattern(q:string){return '%'+q.replace(/[\\%_]/g,m=>'\\'+m)+'%';}
export function filters(value:unknown={}):LibraryFilter{const v=object(value,['status','visibility','limit','cursor','q','mime']);const status=v.status??'active';if(status!=='active'&&status!=='archived')invalid();const limit=v.limit??20;if(!Number.isInteger(limit)||Number(limit)<1||Number(limit)>MEDIA_PAGE_MAX)invalid();const vis=v.visibility==null?null:visibility(v.visibility);const q=v.q==null||v.q===''?null:text(v.q,120);if(v.mime!=null&&!MEDIA_MIMES.includes(v.mime as MediaMime))invalid();const mime=(v.mime??null) as MediaMime|null;const scope=q===null&&mime===null?JSON.stringify([status,vis]):JSON.stringify([status,vis,q,mime]);let cursor:LibraryFilter['cursor']=null;if(v.cursor!=null){if(typeof v.cursor!=='string'||v.cursor.length>1024)invalid();try{const c=JSON.parse(Buffer.from(v.cursor,'base64url').toString());if(c.scope!==scope||typeof c.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(c.createdAt)||!Number.isFinite(Date.parse(c.createdAt)))invalid();cursor={createdAt:c.createdAt,id:uuid(c.id)};}catch{invalid();}}return{status,visibility:vis,limit:Number(limit),cursor,q,mime};}
export function cursorScope(f:LibraryFilter){return f.q===null&&f.mime===null?JSON.stringify([f.status,f.visibility]):JSON.stringify([f.status,f.visibility,f.q,f.mime]);}
export function metadataInput(value:unknown){const v=object(value,['id','expectedVersion','altText','caption','visibility']);if(!Number.isInteger(v.expectedVersion)||Number(v.expectedVersion)<1)invalid();if(!['altText','caption','visibility'].some(k=>k in v))invalid();if('altText' in v&&text(v.altText,512)===null)throw new MediaError('MEDIA_ALT_REQUIRED');return{id:uuid(v.id),version:Number(v.expectedVersion),patch:{...('altText'in v?{alt_text:text(v.altText,512)}:{}),...('caption'in v?{caption:text(v.caption,2000)}:{}),...('visibility'in v?{visibility:visibility(v.visibility)}:{})}};}
export function archiveInput(value:unknown){const v=object(value,['id','expectedVersion']);if(!Number.isInteger(v.expectedVersion)||Number(v.expectedVersion)<1)invalid();return{id:uuid(v.id),version:Number(v.expectedVersion)};}
/** D3.1 presign request: metadata only, never bytes, so the request stays far below the platform body limit. */
export function uploadRequestInput(value:unknown){const v=object(value,['filename','mimeType','sizeBytes','altText','caption','visibility']),policy=mediaPolicy();
 if(!MEDIA_MIMES.includes(v.mimeType as MediaMime))throw new MediaError('MEDIA_UNSUPPORTED_TYPE');
 if(!Number.isSafeInteger(v.sizeBytes)||Number(v.sizeBytes)<1)throw new MediaError('MEDIA_INVALID_CONTENT');
 if(Number(v.sizeBytes)>policy.maxBytes)throw new MediaError('MEDIA_TOO_LARGE');
 const filename=text(v.filename,255);if(!filename||/[\/\\]/.test(filename)||filename.includes('..'))invalid();
 const altText=text(v.altText,512);if(!altText)throw new MediaError('MEDIA_ALT_REQUIRED');
 return{filename,mimeType:v.mimeType as MediaMime,sizeBytes:Number(v.sizeBytes),altText,caption:text(v.caption,2000),visibility:visibility(v.visibility)};}
export function finalizeInput(value:unknown){const v=object(value,['uploadId']);return{uploadId:uuid(v.uploadId)};}
export function usageInput(value:unknown){const v=object(value,['id']);return{id:uuid(v.id)};}
