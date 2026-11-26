import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loader } from './frontend-loader.mjs';
const dto = { account: { id:'private-id',email:'private@example.test',memberId:'stable-member',status:'active',emailVerified:true }, profile: { fullName:'Member',phone:null,city:null,instagramHandle:'runner',emergencyContactName:null,emergencyContactPhone:null,version:'a'.repeat(64) }, completion:{percentage:20,missingFields:['phone','city','emergencyContact']} };
test('projection retains stable member identity but excludes private identity and role fields',()=>{
 const {projectProfile}=loader()('lib/member/profile-adapter.ts');
 const result=projectProfile({ok:true,data:dto});
 assert.equal(result.state,'ready'); assert.equal(result.profile.memberId,'stable-member');
 assert.equal(result.profile.values.instagram,'runner');
 assert.deepEqual(result.profile.completion.missingFields,['phone','city','emergencyContactName','emergencyContactPhone']);
 assert.equal(JSON.stringify(result).includes('private-id'),false); assert.equal(JSON.stringify(result).includes('private@example.test'),false);
});
test('inactive and provider-only verified accounts remain denied',()=>{
 const {projectProfile}=loader()('lib/member/profile-adapter.ts');
 for(const [status,code] of [['pending_verification','EMAIL_NOT_VERIFIED'],['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]) assert.equal(projectProfile({ok:true,data:{...dto,account:{...dto.account,status}}}).code,code);
 assert.equal(projectProfile({ok:true,data:{...dto,account:{...dto.account,emailVerified:false}}}).state,'error');
});
test('profile mutation delegates whitelisted fields and revision to authorized backend',async()=>{
 let input;
 const {saveProfile}=loader({'./profile-actions':{updateOwnMemberProfile:async value=>{input=value;return {ok:false,code:'CONFLICT'};}}})('lib/member/profile-action.ts');
 const result=await saveProfile({fullName:'Member',phone:'',city:'',instagram:'runner',emergencyContactName:'',emergencyContactPhone:'',accountId:'attacker',role:'super_admin'},'revision');
 assert.equal(result.code,'PROFILE_CONFLICT'); assert.equal(input.expectedVersion,'revision'); assert.equal(input.changes.instagramHandle,'runner'); assert.equal('role' in input.changes,false); assert.equal('accountId' in input.changes,false);
});
test('legacy session and dashboard actions are retired; nothing imports them or the public.* profile tables',()=>{
 for(const file of ['lib/session.ts','app/dashboard/actions.ts']) assert.equal(existsSync(file),false,file);
 const sources=execFileSync('git',['ls-files','app','features','components','lib'],{encoding:'utf8'}).split('\n').filter(file=>/\.(ts|tsx)$/.test(file)&&file!=='lib/auth/legacy-cutover.ts'); // read-only identity cutover guard
 for(const file of sources){const code=readFileSync(file,'utf8');assert.doesNotMatch(code,/@\/lib\/session["']|from ["']\.\/actions["'].*signOut|public\.user_profiles|public\.event_registrations/,file);}
 assert.match(readFileSync('app/dashboard/layout.tsx','utf8'),/import \{ signOut \} from "@\/lib\/auth\/flow-actions"/);
});
test('signOut ends the provider session then redirects home, and surfaces provider failure',async()=>{
 let redirected=null,ok=true;
 const mocks={'next/cache':{revalidatePath:()=>{}},'next/navigation':{redirect:path=>{redirected=path;}},'./flow-service':{executeAuthFlow:async()=>({})},'./server':{isAuthConfigured:()=>true,getAuth:()=>({signOut:async()=>ok?{}:{error:'down'}})}};
 const {signOut}=loader(mocks)('lib/auth/flow-actions.ts');
 await signOut();assert.equal(redirected,'/');
 redirected=null;ok=false;
 await assert.rejects(signOut(),/Sign out is unavailable/);assert.equal(redirected,null);
});
