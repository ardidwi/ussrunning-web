import 'server-only';
import {resolveManagedPassWithEffect} from '@/lib/passes/pass-service';
import {PassError} from '@/lib/passes/pass-errors';
import {AccountError} from '@/lib/auth/errors';
import {AuthorizationError} from '@/lib/authz/errors';
import {CheckInConfigError} from './check-in-config';
import {attendanceEffect} from './check-in-repository';
import type {CheckInCode,ScanResult} from './check-in-types';
const passCodes:Record<string,CheckInCode>={
 EVENT_PASS_VALIDATION_ERROR:'PASS_INVALID',EVENT_PASS_NOT_FOUND:'PASS_INVALID',EVENT_PASS_REVOKED:'PASS_REVOKED',EVENT_PASS_EXPIRED:'PASS_EXPIRED',EVENT_PASS_PROTOCOL_UNSUPPORTED:'PASS_INVALID',EVENT_PASS_NOT_ELIGIBLE:'ACCOUNT_INELIGIBLE',INSUFFICIENT_PERMISSION:'FORBIDDEN'
};
export async function checkInEventPass(value:unknown):Promise<ScanResult>{
 try {
  const r=await resolveManagedPassWithEffect(value,attendanceEffect),e=r.effect;
  if(e?.code==='CHECK_IN_RATE_LIMITED')return {ok:false,code:e.code,retryAfterSeconds:e.retryAfterSeconds};
  if(!e)return {ok:false,code:'SERVER_ERROR'};
  if((e.code==='CHECK_IN_SUCCESS'||e.code==='ALREADY_CHECKED_IN')&&e.data)return {ok:true,code:e.code,data:e.data};
  return {ok:false,code:e.code};
 }catch(e){
  if(e instanceof CheckInConfigError)return {ok:false,code:'CHECK_IN_NOT_CONFIGURED'};
  if(e instanceof PassError)return {ok:false,code:passCodes[e.code]??'SERVER_ERROR'};
  if(e instanceof AccountError){
   const codes:Record<string,CheckInCode>={UNAUTHENTICATED:'UNAUTHENTICATED',EMAIL_NOT_VERIFIED:'EMAIL_NOT_VERIFIED',ACCOUNT_SUSPENDED:'ACCOUNT_SUSPENDED',ACCOUNT_DEACTIVATED:'ACCOUNT_DEACTIVATED'};
   return {ok:false,code:codes[e.code]??'SERVER_ERROR'};
  }
  if(e instanceof AuthorizationError)return {ok:false,code:e.code==='INSUFFICIENT_PERMISSION'?'FORBIDDEN':'SERVER_ERROR'};
  return {ok:false,code:'SERVER_ERROR'};
 }
}
