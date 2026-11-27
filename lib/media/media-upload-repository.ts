import 'server-only';
import {getSql,query} from '@/lib/db';
import {authority,projection,roles} from './media-repository';
import type {MediaRecord} from './media-types';

export type UploadIntent={id:string;storageKey:string;storageProvider:string;mimeType:'image/jpeg'|'image/png'|'image/webp';declaredBytes:number;visibility:'private'|'public';status:'pending'|'finalized'|'rejected';expired:boolean};
export type NewIntent={id:string;key:string;provider:string;mime:string;bytes:number;filename:string;altText:string;caption:string|null;visibility:string;ttlSeconds:number};
const utc=(c:string)=>`to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/** Same lock order as media-repository: actor, role rows, then the intent row. */
async function transaction<T>(actor:string,id:string|null,text:string,params:unknown[]):Promise<T>{const sql=getSql();const result=await sql.transaction([
 sql.query("SELECT set_config('lock_timeout','15s',true)"),
 sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE',[actor]),
 sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,r',[actor]),
 sql.query('SELECT id FROM uss.media_upload_intents WHERE id=$1 FOR UPDATE',[id]),
 sql.query(text,[actor,roles,...params])],{isolationLevel:'ReadCommitted'});return(result[4] as T[])[0];}

/** Authority, shared upload rate limit (same audit action as direct uploads) and intent creation are atomic. */
export async function createIntent(actor:string,input:NewIntent,max:number,seconds:number){return transaction<{code:string;expiresAt:string|null}>(actor,null,`WITH authority AS MATERIALIZED(${authority}),input AS(SELECT $3::jsonb p),decision AS MATERIALIZED(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'MEDIA_FORBIDDEN' WHEN (SELECT count(*) FROM uss.audit_logs WHERE actor_account_id=$1 AND action='media.upload.requested' AND created_at>clock_timestamp()-make_interval(secs=>$5::int))>=$4 THEN 'MEDIA_RATE_LIMITED' ELSE 'OK' END code),
 audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) SELECT $1,'media.upload.requested','media',(p->>'id')::uuid,jsonb_build_object('mode','presigned','mimeType',p->>'mime','declaredBytes',(p->>'bytes')::bigint) FROM decision,input WHERE code='OK' RETURNING id),
 intent AS(INSERT INTO uss.media_upload_intents(id,actor_account_id,storage_provider,storage_key,mime_type,declared_bytes,original_filename,alt_text,caption,visibility,expires_at) SELECT (p->>'id')::uuid,$1,p->>'provider',p->>'key',p->>'mime',(p->>'bytes')::bigint,p->>'filename',p->>'altText',p->>'caption',p->>'visibility',clock_timestamp()+make_interval(secs=>(p->>'ttlSeconds')::int) FROM decision,input WHERE code='OK' RETURNING expires_at)
 SELECT code,(SELECT ${utc('expires_at')} FROM intent) "expiresAt" FROM decision`,[JSON.stringify(input),max,seconds]);}

/** Only the uploading account can see or finalise its intent; another account gets the same "not found". */
export async function readIntent(actor:string,id:string){return(await query<{authorized:boolean;data:UploadIntent|null}>(`WITH authority AS MATERIALIZED(${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,(SELECT jsonb_build_object('id',i.id,'storageKey',i.storage_key,'storageProvider',i.storage_provider,'mimeType',i.mime_type,'declaredBytes',i.declared_bytes,'visibility',i.visibility,'status',i.status,'expired',i.expires_at<=clock_timestamp()) FROM uss.media_upload_intents i WHERE i.id=$3 AND i.actor_account_id=$1 AND EXISTS(SELECT 1 FROM authority)) data`,[actor,roles,id]))[0];}

/** Rejected uploads keep an immutable record of why; the object itself is deleted by the service. */
export async function rejectIntent(actor:string,id:string,code:string){return transaction<{code:string}>(actor,id,`WITH changed AS(UPDATE uss.media_upload_intents SET status='rejected',rejection_code=$4,resolved_at=clock_timestamp() WHERE id=$3 AND actor_account_id=$1 AND status='pending' AND cardinality($2::text[])>=0 RETURNING id),audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) SELECT $1,'media.upload.rejected','media',id,jsonb_build_object('code',$4::text) FROM changed RETURNING id) SELECT CASE WHEN EXISTS(SELECT 1 FROM changed) THEN 'OK' ELSE 'MEDIA_CONFLICT' END code`,[id,code]);}

export type Measured={bytes:number;width:number;height:number;checksum:string};
/** Post-lock recheck of authority, ownership, state and expiry; media row + intent resolution + audit commit together. */
export async function finalizeIntent(actor:string,id:string,m:Measured){return transaction<{code:string;already:boolean;data:MediaRecord|null}>(actor,id,`WITH authority AS MATERIALIZED(${authority}),intent AS MATERIALIZED(SELECT * FROM uss.media_upload_intents WHERE id=$3 AND actor_account_id=$1),
 decision AS MATERIALIZED(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'MEDIA_FORBIDDEN' WHEN NOT EXISTS(SELECT 1 FROM intent) THEN 'MEDIA_NOT_FOUND' WHEN (SELECT status FROM intent)='finalized' THEN 'ALREADY' WHEN (SELECT status FROM intent)<>'pending' THEN 'MEDIA_CONFLICT' WHEN (SELECT expires_at FROM intent)<=clock_timestamp() THEN 'MEDIA_UPLOAD_EXPIRED' WHEN (SELECT declared_bytes FROM intent)<>$4::bigint THEN 'MEDIA_INVALID_CONTENT' ELSE 'OK' END code),
 created AS(INSERT INTO uss.media_assets(id,storage_key,storage_provider,mime_type,byte_size,width,height,checksum_sha256,original_filename,alt_text,caption,visibility,uploaded_by) SELECT i.id,i.storage_key,i.storage_provider,i.mime_type,$4::bigint,$5::int,$6::int,$7::text,i.original_filename,i.alt_text,i.caption,i.visibility,$1 FROM intent i,decision WHERE decision.code='OK' RETURNING *),
 resolved AS(UPDATE uss.media_upload_intents u SET status='finalized',resolved_at=clock_timestamp() FROM created c WHERE u.id=c.id RETURNING u.id),
 audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) SELECT $1,'media.created','media',id,jsonb_build_object('changedFields',ARRAY['storage_reference','image_metadata'],'mode','presigned') FROM created RETURNING id)
 SELECT CASE WHEN code='ALREADY' THEN 'OK' ELSE code END code,code='ALREADY' already,(SELECT ${projection} FROM created m) data FROM decision`,[id,m.bytes,m.width,m.height,m.checksum]);}
