"use server";
import * as service from './pass-service';
import { PassError } from './pass-errors';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';
import type { PassCode } from './pass-errors';
import type { AuthorizationCode } from '@/lib/authz/errors';
export type PassResult<T>={ok:true;data:T}|{ok:false;code:PassCode|AuthorizationCode};
async function run<T>(fn:()=>Promise<T>):Promise<PassResult<T>> {
 try{return {ok:true,data:await fn()};}catch(e){return {ok:false,code:e instanceof PassError || e instanceof AccountError || e instanceof AuthorizationError ? e.code : 'EVENT_PASS_UNAVAILABLE'};}
}
export async function issueCurrentEventPass(value:unknown){return run(()=>service.issueOwnPass(value));}
export async function getCurrentEventPass(value:unknown){return run(()=>service.getOwnPass(value));}
export async function issueEventPass(value:unknown){return run(()=>service.issueManagedPass(value));}
export async function getEventPass(value:unknown){return run(()=>service.getManagedPass(value));}
export async function revokeEventPass(value:unknown){return run(()=>service.revokeManagedPass(value));}
