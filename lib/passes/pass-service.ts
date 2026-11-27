import "server-only";
import { requireActiveAccount } from '@/lib/auth/guards';
import { requirePermission } from '@/lib/authz/guards';
import { AuthorizationError } from '@/lib/authz/errors';
import { PassError, passOperation } from './pass-errors';
import type { PassCode } from './pass-errors';
import type { EventPassDTO, PassResolution } from './pass-types';
import { reference, revocation, resolution } from './pass-validation';
import { candidate, present } from './pass-token';
import type { PassEffect } from './pass-repository';
import { passTransaction, issueJobPass } from './pass-repository';
async function actor(managed:boolean) { return managed ? (await requirePermission('events.manage')).account : await requireActiveAccount(); }
function check(code:string) {
 if(code==='INSUFFICIENT_PERMISSION') throw new AuthorizationError('INSUFFICIENT_PERMISSION');
 if(code!=='OK') throw new PassError(code as PassCode);
}
async function card(value:unknown,managed:boolean,issue:boolean):Promise<EventPassDTO> {
 const a=await actor(managed),v=reference(value);
 const result=await passTransaction({actorId:a.id,managed,...v,mode:issue?'issue':'read',candidate:issue?candidate(v.eventId,v.registrationId):undefined});
 check(result.code);if(!result.data) throw new PassError('EVENT_PASS_UNAVAILABLE');
 return present(result.data);
}
export async function issueOwnPass(value:unknown) { return passOperation(()=>card(value,false,true)); }
export async function getOwnPass(value:unknown) { return passOperation(()=>card(value,false,false)); }
export async function issueManagedPass(value:unknown) { return passOperation(()=>card(value,true,true)); }
export async function getManagedPass(value:unknown) { return passOperation(()=>card(value,true,false)); }
export async function revokeManagedPass(value:unknown) {
 return passOperation(async()=>{
  const a=await actor(true),v=revocation(value),r=await passTransaction({actorId:a.id,managed:true,...v,mode:'revoke'});
  check(r.code);if(!r.data) throw new PassError('EVENT_PASS_UNAVAILABLE');
  return {id:r.data.id,registrationId:r.data.registrationId,eventId:r.data.eventId,status:'revoked' as const,revokedAt:r.data.revokedAt,reason:r.data.revokedReason};
 });
}
/** Protected backend lookup only. This is NOT check-in authorization or an attendance write. */
export async function resolveManagedPass(value:unknown):Promise<PassResolution> {
 return passOperation(async()=>{
  const a=await actor(true),v=resolution(value),r=await passTransaction({actorId:a.id,managed:true,eventId:v.eventId,lookupHash:v.hash,mode:'resolve'});
  check(r.code);if(!r.resolution) throw new PassError('EVENT_PASS_NOT_FOUND');return r.resolution;
 });
}

/** Server-owned transaction composition: same protected resolver and lock order, no client SQL. */
export async function resolveManagedPassWithEffect<T>(value:unknown,effect:()=>PassEffect<T>) {
 const a=await actor(true),v=resolution(value);
 return passTransaction({actorId:a.id,managed:true,eventId:v.eventId,lookupHash:v.hash,mode:'resolve'},effect());
}

/**
 * D4.1 automatic issuance for a confirmed registration, called only by the authenticated notification job.
 * Server-only and deliberately NOT exported through pass-actions ("use server"), so no browser can invoke it.
 * Idempotent: an existing pass (active, revoked or expired) is returned as-is and never replaced.
 */
export async function issuePassForConfirmedRegistration(eventId:string,registrationId:string){
 return passOperation(async()=>issueJobPass(registrationId,candidate(eventId,registrationId)));
}
