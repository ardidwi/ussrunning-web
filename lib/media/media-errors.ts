import 'server-only';
import {AccountError} from '@/lib/auth/errors';
import {AuthorizationError} from '@/lib/authz/errors';
export type MediaCode='MEDIA_UNSUPPORTED_TYPE'|'MEDIA_TOO_LARGE'|'MEDIA_INVALID_CONTENT'|'MEDIA_INVALID_DIMENSIONS'|'MEDIA_VALIDATION_ERROR'|'MEDIA_NOT_FOUND'|'MEDIA_FORBIDDEN'|'MEDIA_STORAGE_UNAVAILABLE'|'MEDIA_CONFLICT'|'MEDIA_IN_USE'|'MEDIA_UPLOAD_FAILED'|'MEDIA_RATE_LIMITED'|'MEDIA_NOT_CONFIGURED'|'MEDIA_UNAVAILABLE';
export class MediaError extends Error{constructor(public readonly code:MediaCode){super(code);}}
export async function mediaOperation<T>(f:()=>Promise<T>):Promise<T>{try{return await f();}catch(e){if(e instanceof MediaError||e instanceof AccountError)throw e;if(e instanceof AuthorizationError)throw new MediaError(e.code==='INSUFFICIENT_PERMISSION'?'MEDIA_FORBIDDEN':'MEDIA_UNAVAILABLE');throw new MediaError('MEDIA_UNAVAILABLE');}}
