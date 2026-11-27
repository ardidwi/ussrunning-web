import 'server-only';
import {MediaError} from '../media-errors';
import type {StorageProvider,StoredObject} from './storage-provider';
/** Explicit development/test-only adapter; never selected by deployed application. */
export class MemoryStorage implements StorageProvider {
 readonly id='memory-test';private readonly objects=new Map<string,Uint8Array>();private total=0;
 constructor(private readonly maxBytes=33554432){if(process.env.NODE_ENV==='production')throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');}
 private key(key:string){if(!/^[a-z0-9/-]+\.(jpg|png|webp)$/.test(key)||key.includes('..'))throw new MediaError('MEDIA_INVALID_CONTENT');return key;}
 async put(key:string,bytes:Uint8Array){this.key(key);if(this.objects.has(key))throw new MediaError('MEDIA_CONFLICT');if(this.total+bytes.length>this.maxBytes)throw new MediaError('MEDIA_STORAGE_UNAVAILABLE');this.objects.set(key,Uint8Array.from(bytes));this.total+=bytes.length;}
 async deliveryUrl(){return null;}
 async presignPut(key:string){return{url:`memory://upload/${this.key(key)}`,headers:{}};}
 async readObject(key:string,_visibility:unknown,maxBytes:number):Promise<StoredObject|null>{const b=this.objects.get(this.key(key));if(!b)return null;return{size:b.length,bytes:b.length>maxBytes?null:Uint8Array.from(b)};}
 async deleteObject(key:string){const b=this.objects.get(this.key(key));if(b){this.total-=b.length;this.objects.delete(key);}}
 readForTest(key:string){const b=this.objects.get(key);return b?Uint8Array.from(b):null;}
}
