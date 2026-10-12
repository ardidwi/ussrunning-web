import 'server-only';
import {MediaError} from './media-errors';
export const MEDIA_MIMES=['image/jpeg','image/png','image/webp'] as const;
export const MEDIA_PAGE_MAX=100;
export function mediaPolicy(){
 const read=(key:string,def:number,max:number)=>{const n=process.env[key]===undefined?def:Number(process.env[key]);if(!Number.isInteger(n)||n<1||n>max)throw new MediaError('MEDIA_NOT_CONFIGURED');return n;};
 const prefix=process.env.MEDIA_STORAGE_PREFIX??'uss-media';
 if(!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(prefix)||prefix.length>100)throw new MediaError('MEDIA_NOT_CONFIGURED');
 return {maxBytes:read('MEDIA_MAX_UPLOAD_BYTES',10485760,52428800),maxDimension:read('MEDIA_MAX_DIMENSION',8192,16384),maxPixels:read('MEDIA_MAX_PIXELS',16000000,64000000),uploads:read('MEDIA_UPLOAD_MAX_REQUESTS',10,100),windowSeconds:read('MEDIA_UPLOAD_WINDOW_SECONDS',60,3600),prefix};
}
