import test from 'node:test';
import assert from 'node:assert/strict';
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
test('legacy authorization ignores provider/admin-email claims and reads current DB roles',async()=>{
 const mocks={'next/navigation':{redirect:()=>{throw Error('redirect')}},'@/lib/db':{},'@/lib/auth/session':{requireAuthenticatedUser:async()=>({providerUserId:'provider',email:'member@test.invalid',role:'super_admin'})},'@/lib/authz/guards':{getAuthorization:async()=>({account:{email:'member@test.invalid',displayName:'Member'},roles:['member']})}};
 const {getCurrentUser}=loader(mocks)('lib/session.ts');
 assert.equal((await getCurrentUser()).role,'member');
 mocks['@/lib/authz/guards'].getAuthorization=async()=>{throw Error('ACCOUNT_SUSPENDED')};
 assert.equal(await getCurrentUser(),null);
});
