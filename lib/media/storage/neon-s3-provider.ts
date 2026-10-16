import 'server-only';
import {GetObjectCommand,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {MediaError} from '../media-errors';
import type {MediaMime,MediaVisibility} from '../media-types';
import type {StorageProvider} from './storage-provider';

type StorageConfig={endpoint:string;region:string;accessKeyId:string;secretAccessKey:string;publicBucket:string;privateBucket:string;privateUrlTtlSeconds:number};

function envValue(name:string){return process.env[name]?.trim()??'';}
function safeBucket(value:string){return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value);}
function safeEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&u.pathname==='/'?u:null;}catch{return null;}}
export function storageConfigFromEnv():StorageConfig|null{
 const endpoint=envValue('AWS_ENDPOINT_URL_S3'),region=envValue('AWS_REGION'),accessKeyId=envValue('AWS_ACCESS_KEY_ID'),secretAccessKey=envValue('AWS_SECRET_ACCESS_KEY'),publicBucket=envValue('MEDIA_PUBLIC_BUCKET_NAME'),privateBucket=envValue('MEDIA_PRIVATE_BUCKET_NAME');
 const ttl=Number(envValue('MEDIA_PRIVATE_URL_TTL_SECONDS')||'300'),url=safeEndpoint(endpoint);
 if(!url||!region||!accessKeyId||!secretAccessKey||!safeBucket(publicBucket)||!safeBucket(privateBucket)||publicBucket===privateBucket||!Number.isInteger(ttl)||ttl<60||ttl>900)return null;
 return{endpoint:url.toString(),region,accessKeyId,secretAccessKey,publicBucket,privateBucket,privateUrlTtlSeconds:ttl};
}
function objectKey(key:string){if(!/^[a-z0-9/-]+\.(jpg|png|webp)$/.test(key)||key.includes('..'))throw new MediaError('MEDIA_INVALID_CONTENT');return key;}
function encodeKey(key:string){return key.split('/').map(encodeURIComponent).join('/');}
function isConflict(error:unknown){if(!error||typeof error!=='object')return false;const e=error as {$metadata?:{httpStatusCode?:number};name?:string};return e.$metadata?.httpStatusCode===412||e.name==='PreconditionFailed';}

export class NeonS3Storage implements StorageProvider{
 readonly id='neon-s3';private readonly client:S3Client;
 constructor(private readonly config:StorageConfig){
  this.client=new S3Client({region:config.region,endpoint:config.endpoint,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},forcePathStyle:true,requestChecksumCalculation:'WHEN_REQUIRED'});
 }
 async put(key:string,bytes:Uint8Array,mime:MediaMime,visibility:MediaVisibility){
  const k=objectKey(key),Bucket=visibility==='public'?this.config.publicBucket:this.config.privateBucket;
  try{await this.client.send(new PutObjectCommand({Bucket,Key:k,Body:bytes,ContentType:mime,CacheControl:visibility==='public'?'public, max-age=31536000, immutable':'private, no-store',IfNoneMatch:'*'}));}
  catch(error){if(isConflict(error))throw new MediaError('MEDIA_CONFLICT');throw new MediaError('MEDIA_UPLOAD_FAILED');}
 }
 async deliveryUrl(key:string,visibility:MediaVisibility){
  const k=objectKey(key);
  if(visibility==='public'){const endpoint=new URL(this.config.endpoint);endpoint.pathname=`/${encodeURIComponent(this.config.publicBucket)}/${encodeKey(k)}`;return endpoint.toString();}
  return getSignedUrl(this.client,new GetObjectCommand({Bucket:this.config.privateBucket,Key:k,ResponseContentDisposition:'inline'}),{expiresIn:this.config.privateUrlTtlSeconds});
 }
}

export function createConfiguredStorage(){const config=storageConfigFromEnv();return config?new NeonS3Storage(config):null;}
