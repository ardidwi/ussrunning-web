"use client";
import { useRef,useState } from "react";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import type { ManagedPartner,ManagedSponsorship,PartnerContent,PartnerStatus,RelationContent } from "@/lib/partners/partner-types";
import type { MediaAsset } from "@/lib/media/media-types";
import { PartnerEditor,partnerOperations } from "./PartnerEditor";
import { PartnerList } from "./PartnerList";
const id="11111111-1111-4111-8111-111111111111",eventId="22222222-2222-4222-8222-222222222222";
const media:MediaAsset={id:"33333333-3333-4333-8333-333333333333",url:"/uss-logo.png",deliveryAvailable:true,mimeType:"image/png",sizeBytes:1000,width:200,height:100,altText:"Fictional partner logo",caption:null,visibility:"public",status:"active",version:1,createdAt:"2026-10-15T00:00:00Z",updatedAt:"2026-10-15T00:00:00Z"};
const base:ManagedPartner={id,slug:"fictional-crew-partner",name:"FICTIONAL CREW PARTNER",description:"Fictional partner description.\nSecond paragraph.",websiteUrl:"https://example.test",logoMediaId:media.id,logo:media,type:"partner",tier:null,visibility:"private",isGlobal:false,activeFrom:null,activeUntil:null,status:"draft",version:1,sortOrder:0,createdAt:"2026-10-15T00:00:00Z",updatedAt:"2026-10-15T00:00:00Z"};
const row=(partner:ManagedPartner,n:number):ManagedSponsorship=>({id:`44444444-4444-4444-8444-${String(n).padStart(12,"0")}`,eventId,partnerId:partner.id,partner,status:"active",version:1,sortOrder:n-1,tier:null,placement:"event_page",activeFrom:null,activeUntil:null});
/** Production cannot activate this fictional fixture. No real identity or writer is called. */
export default function PartnerReference({scenario,view,role="admin"}:{scenario:string;view?:string;role?:"member"|"admin"|"super_admin"}){
 const initial={...base,...(["active","inactive","archived"].includes(scenario)?{status:scenario as PartnerStatus}:{}),...(scenario==="media-unavailable"?{logo:{...media,url:null,deliveryAvailable:false}}:{})};
 const current=useRef(initial),relations=useRef(scenario==="empty-relations"?[]:scenario==="paginated-drafts"?Array.from({length:101},(_,index)=>row(index===0?initial:{...base,id:`88888888-8888-4888-8888-${String(index).padStart(12,"0")}`,name:`PAGINATED SPONSOR ${index+1}`},index+1)):[row(initial,1),row({...base,id:"55555555-5555-4555-8555-555555555555",name:"SECOND FICTIONAL SPONSOR"},2)]);
 const [requests,setRequests]=useState(0),[lastInput,setLastInput]=useState<unknown>(null);
 if(process.env.NODE_ENV!=="development")return null;
 const snapshot={displayName:"Fictional editor",roles:[role],permissions:ROLE_PERMISSIONS[role]};
 async function record(value:unknown){setRequests(v=>v+1);setLastInput(value);await new Promise(r=>setTimeout(r,300));}
 const settle=(p:ManagedPartner)=>{current.current=p;return{ok:true as const,data:p};};
 async function lifecycle(status:PartnerStatus,value:unknown){await record(value);return scenario==="invalid-state"?{ok:false as const,code:"PARTNER_INVALID_STATE" as const}:settle({...current.current,status,version:current.current.version+1});}
 const api:Partial<typeof partnerOperations>={
  createEditorPartner:async(value:unknown)=>{await record(value);return scenario==="slug-conflict"?{ok:false,code:"PARTNER_SLUG_TAKEN"}:settle({...current.current,...value as PartnerContent,status:"draft"});},
  updateEditorPartner:async(value:unknown)=>{await record(value);const v=value as{changes:Partial<PartnerContent>};return scenario==="save-forbidden"?{ok:false,code:"PARTNER_FORBIDDEN"}:scenario==="conflict"?{ok:false,code:"PARTNER_CONFLICT"}:scenario==="server-error"?{ok:false,code:"PARTNER_UNAVAILABLE"}:settle({...current.current,...v.changes,version:current.current.version+1});},
  readEditorPartner:async()=>({ok:true,data:scenario==="conflict"?{...current.current,name:"LATEST FICTIONAL PARTNER",version:10}:current.current}),
  activateEditorPartner:v=>lifecycle("active",v),deactivateEditorPartner:v=>lifecycle("inactive",v),archiveEditorPartner:v=>lifecycle("archived",v),
  listPickerMedia:async()=>({ok:true,data:{items:[media,{...media,id:"66666666-6666-4666-8666-666666666666",url:null,deliveryAvailable:false,altText:"Fictional unavailable logo"}],nextCursor:null}}),
  readPartnerEvents:async()=>scenario==="event-error"?{ok:false,code:"EVENT_UNAVAILABLE"}:{ok:true,data:{items:[{id:eventId,title:"FICTIONAL CITY RUN",status:"published"},{id:"77777777-7777-4777-8777-777777777777",title:"ANOTHER FICTIONAL RUN",status:"draft"}],nextCursor:null}},
  listEditorSponsorships:async(value:unknown)=>{const v=value as{eventId:string;cursor?:string};const source=v.eventId===eventId?relations.current:[];return {ok:true,data:{items:scenario==="paginated-drafts"?v.cursor?source.slice(100):source.slice(0,100):source,nextCursor:scenario==="paginated-drafts"&&!v.cursor?"fixture-tail":scenario==="partial-relations"?"fixture-next":null}};},
  attachEditorSponsorship:async(value:unknown)=>{await record(value);const v=value as RelationContent&{eventId:string};const r={...row(current.current,3),...v};relations.current=[...relations.current,r];current.current={...current.current,version:current.current.version+1};return{ok:true,data:r};},
  updateEditorSponsorship:async(value:unknown)=>{await record(value);if(scenario==="relation-forbidden")return{ok:false,code:"PARTNER_FORBIDDEN"};if(scenario==="relation-conflict")return{ok:false,code:"PARTNER_RELATION_CONFLICT"};const v=value as{relationId:string;changes:RelationContent};const previous=relations.current.find(r=>r.id===v.relationId)!;const next={...previous,...v.changes,version:previous.version+1};relations.current=relations.current.map(r=>r.id===next.id?next:r);current.current={...current.current,version:current.current.version+1};return{ok:true,data:next};},
  detachEditorSponsorship:async(value:unknown)=>{await record(value);const v=value as{relationId:string};const next={...relations.current.find(r=>r.id===v.relationId)!,status:"inactive" as const};relations.current=relations.current.filter(r=>r.id!==v.relationId);current.current={...current.current,version:current.current.version+1};return{ok:true,data:next};},
  reorderEditorSponsorships:async(value:unknown)=>{await record(value);if(scenario==="relation-conflict")return{ok:false,code:"PARTNER_RELATION_CONFLICT"};const v=value as{eventId:string;relations:{id:string;expectedVersion:number}[]};relations.current=v.relations.map((x,index)=>({...relations.current.find(r=>r.id===x.id)!,sortOrder:index,version:x.expectedVersion+1}));current.current={...current.current,version:current.current.version+1};return{ok:true,data:{eventId:v.eventId,code:"PARTNER_REORDERED"}};}
 };
 const error=scenario==="forbidden"?"INSUFFICIENT_PERMISSION":scenario==="unauthenticated"?"UNAUTHENTICATED":scenario==="suspended"?"ACCOUNT_SUSPENDED":scenario==="unavailable"?"PARTNER_UNAVAILABLE":null;
 return <PermissionsProvider snapshot={snapshot}><CmsShell module="partners" displayName={snapshot.displayName}><p className="uss-reference-disclosure">Development-only fictional partners. No real records, sessions or storage writes.</p><output data-testid="partner-requests">Requests: {requests}</output><pre data-testid="partner-input" hidden>{JSON.stringify(lastInput)}</pre>{error?<ServiceFeedback code={error}/>:role==="member"?<ServiceFeedback code="INSUFFICIENT_PERMISSION"/>:view==="list"?<PartnerList items={scenario==="empty"?[]:[initial]} nextCursor={scenario==="pagination"?"fixture-cursor":null}/>:<PartnerEditor initial={view==="create"?null:initial} operations={api} startPreview={view==="preview"}/>}</CmsShell></PermissionsProvider>;
}
