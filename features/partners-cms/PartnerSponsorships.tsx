"use client";
import { useEffect,useRef,useState } from "react";
import { Badge,Button,EmptyState,Field,FormSection,Modal,Select } from "@/components/ui";
import { useMemberLeave } from "@/components/dashboard/MemberNavigationGuard";
import type { ManagedPartner,ManagedSponsorship,RelationContent } from "@/lib/partners/partner-types";
import type { PartnerResult } from "@/lib/partners/partner-actions";
import type { partnerOperations } from "./PartnerEditor";
import { PartnerValidityFields } from "./PartnerValidityFields";
import { PARTNER_PLACEMENTS,exactRelationOrder,partnerMessage,relationDraft,validateValidity } from "./model";
type Events={items:{id:string;title:string;status:string}[];nextCursor:string|null};
export function PartnerSponsorships({partner,api,disabled,onDirty,onBusy,onRestricted,onChanged}:{partner:ManagedPartner;api:typeof partnerOperations;disabled:boolean;onDirty:(v:boolean)=>void;onBusy:(v:boolean)=>void;onRestricted:(code:string)=>void;onChanged:()=>Promise<void>}){
 const leave=useMemberLeave(),[events,setEvents]=useState<Events|null>(null),[eventId,setEventId]=useState(""),[eventError,setEventError]=useState(false),[eventLoading,setEventLoading]=useState(false);
 const [items,setItems]=useState<ManagedSponsorship[]>([]),[cursor,setCursor]=useState<string|null>(null),[order,setOrder]=useState<string[]>([]),[drafts,setDrafts]=useState<Record<string,RelationContent>>({}),[attach,setAttach]=useState(()=>relationDraft());
 const [phase,setPhase]=useState<"idle"|"loading"|"error"|"conflict"|"success">("idle"),[notice,setNotice]=useState(""),[detach,setDetach]=useState<ManagedSponsorship|null>(null),[loaded,setLoaded]=useState(false);
 const lock=useRef(false),request=useRef(0),busy=phase==="loading",baselineOrder=items.map(i=>i.id),orderDirty=order.join()!==baselineOrder.join(),fieldsDirty=items.some(i=>JSON.stringify(drafts[i.id])!==JSON.stringify(relationDraft(i))),dirty=orderDirty||fieldsDirty;
 useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
 useEffect(()=>{onBusy(busy);return()=>onBusy(false);},[busy,onBusy]);
 async function loadEvents(more=false){setEventLoading(true);setEventError(false);try{const r=await api.readPartnerEvents(more?events?.nextCursor??undefined:undefined);if(r.ok)setEvents(p=>({items:more?[...(p?.items??[]),...r.data.items]:r.data.items,nextCursor:r.data.nextCursor}));else setEventError(true);}catch{setEventError(true);}finally{setEventLoading(false);}}
 // A bounded selector is loaded on explicit request; no repeated fetch on each render.
 function fail(code:string){if(["PARTNER_FORBIDDEN","UNAUTHENTICATED","ACCOUNT_SUSPENDED","ACCOUNT_DEACTIVATED","EMAIL_NOT_VERIFIED","ACCOUNT_NOT_PROVISIONED"].includes(code)){onRestricted(code);return;}setNotice(partnerMessage(code));setPhase(code.includes("CONFLICT")?"conflict":"error");}
 async function load(id:string,more=false,preserve:Record<string,RelationContent>={},targetCount=0){
  const seq=++request.current;setPhase("loading");
  try{
   let after=more?cursor:null,all=more?[...items]:[],pages=0;
   // Refresh only the pages already opened by this editor. A first-page-only
   // refresh would discard unsaved tiers from later pages after another save.
   const maximumPages=more?1:Math.max(1,Math.ceil(targetCount/100)+1);
   do{
    const r=await api.listEditorSponsorships({eventId:id,status:"active",limit:100,...(after?{cursor:after}:{})});
    if(seq!==request.current)return false;
    if(!r.ok){fail(r.code);return false;}
    all=[...all,...r.data.items.filter(next=>!all.some(old=>old.id===next.id))];
    const previous=after;after=r.data.nextCursor;pages++;
    if(after&&after===previous){fail("PARTNER_RELATION_CONFLICT");return false;}
   }while(!more&&after&&all.length<targetCount&&pages<maximumPages);
   if(!more&&after&&all.length<targetCount){fail("PARTNER_RELATION_CONFLICT");return false;}
   setItems(all);setOrder(all.map(i=>i.id));setDrafts({...Object.fromEntries(all.map(i=>[i.id,relationDraft(i)])),...Object.fromEntries(Object.entries(preserve).filter(([key])=>all.some(i=>i.id===key)))});setCursor(after);setLoaded(true);setPhase("idle");return true;
  }catch{if(seq===request.current)fail("PARTNER_UNAVAILABLE");return false;}
 }
 async function mutate(fn:()=>Promise<PartnerResult<unknown>>,savedId?:string){if(lock.current||disabled||!eventId)return;lock.current=true;setPhase("loading");try{const r=await fn();if(!r.ok){fail(r.code);return;}const preserved=Object.fromEntries(items.filter(i=>i.id!==savedId&&JSON.stringify(drafts[i.id])!==JSON.stringify(relationDraft(i))).map(i=>[i.id,drafts[i.id]]));setDetach(null);const refreshed=await load(eventId,false,preserved,items.length);await onChanged();if(refreshed){setPhase("success");setNotice("Event sponsorship saved. The backend remains the placement authority.");}}catch{fail("PARTNER_UNAVAILABLE");}finally{lock.current=false;}}
 function move(id:string,delta:number){setOrder(prev=>{const next=[...prev],at=next.indexOf(id),to=at+delta;if(at>=0&&to>=0&&to<next.length)[next[at],next[to]]=[next[to],next[at]];return next;});}
 async function attachCurrent(){const errors=validateValidity(attach);if(Object.keys(errors).length){setNotice(Object.values(errors).join(" "));setPhase("error");return;}await mutate(()=>api.attachEditorSponsorship({eventId,partnerId:partner.id,...attach}));}
 async function saveOrder(){if(!exactRelationOrder(items,cursor,order)||fieldsDirty){fail("PARTNER_RELATION_CONFLICT");return;}await mutate(()=>api.reorderEditorSponsorships({eventId,relations:order.map(id=>({id,expectedVersion:items.find(i=>i.id===id)!.version}))}));}
 const blocked=disabled||busy;
 return <FormSection title="EVENT SPONSORSHIPS" description="Event-scoped placement is separate from the global partner record. Save partner metadata before managing relationships.">
 {disabled&&<p>Finish or discard partner changes before editing event relationships.</p>}
 {!events&&<Button variant="secondary" disabled={blocked} loading={eventLoading} onClick={()=>void loadEvents()}>Load event options</Button>}
 {eventError&&<div role="alert"><p>Event options are unavailable. Event-management access may be required.</p><Button variant="secondary" loading={eventLoading} onClick={()=>void loadEvents()}>Retry event options</Button></div>}
 {events&&<><Field label="Event context" hint="Choose the trusted event whose sponsorships you intend to manage."><Select value={eventId} disabled={blocked} onChange={e=>{const id=e.target.value;leave(()=>{setEventId(id);setLoaded(false);setItems([]);setOrder([]);setDrafts({});setNotice("");if(id)void load(id);});}}><option value="">Select an event</option>{events.items.map(e=><option key={e.id} value={e.id}>{e.title} · {e.status}</option>)}</Select></Field>{events.nextCursor&&<Button variant="secondary" loading={eventLoading} onClick={()=>void loadEvents(true)}>Load more events</Button>}</>}
 {eventId&&<><h3>{events?.items.find(e=>e.id===eventId)?.title}</h3><p>Changes below apply only to this event. No event registrations, passes or check-ins are changed.</p><div role={phase==="error"||phase==="conflict"?"alert":"status"} aria-live="polite" className="uss-partner-feedback">{notice||(busy?"Loading sponsorships…":!loaded?"Load the event relationships before editing.":"Active sponsorships loaded.")}</div>
 {(phase==="error"||phase==="conflict")&&<Button variant="secondary" disabled={busy} onClick={()=>leave(()=>void load(eventId))}>Reload event sponsorships</Button>}
 {loaded&&<><div className="uss-member-panel"><h3>Attach {partner.name}</h3><Field label="Placement" hint="BE-14 placement code. This does not change Event Pass branding or issuance."><Select value={attach.placement} disabled={blocked||dirty} onChange={e=>setAttach(p=>({...p,placement:e.target.value as RelationContent["placement"]}))}>{PARTNER_PLACEMENTS.map(v=><option key={v}>{v}</option>)}</Select></Field><PartnerValidityFields prefix="attach" value={attach} disabled={blocked||dirty} onChange={(k,v)=>setAttach(p=>({...p,[k]:v}))}/><Button disabled={blocked||dirty||items.some(i=>i.partnerId===partner.id)} onClick={()=>void attachCurrent()}>Attach partner to event</Button></div>
 {!items.length&&<EmptyState title="No active sponsorships for this event." description="Attach this partner using the controlled backend action."/>}
 <ol className="uss-partner-relations">{order.map((id,index)=>{const item=items.find(i=>i.id===id);if(!item)return null;const value=drafts[id]??relationDraft(item),itemDirty=JSON.stringify(value)!==JSON.stringify(relationDraft(item)),validation=validateValidity(value);return <li key={id} className="uss-member-panel"><h3>{item.partner.name}</h3><Badge>{item.status}</Badge><p>Position {index+1} · Version {item.version}</p><Field label={`Placement for ${item.partner.name}`} hint="This relationship belongs to the selected event."><Select value={value.placement} disabled={blocked||orderDirty} onChange={e=>setDrafts(p=>({...p,[id]:{...value,placement:e.target.value as RelationContent["placement"]}}))}>{PARTNER_PLACEMENTS.map(p=><option key={p}>{p}</option>)}</Select></Field><PartnerValidityFields prefix={`relation-${id}`} value={value} disabled={blocked||orderDirty} errors={validation} onChange={(k,v)=>setDrafts(p=>({...p,[id]:{...value,[k]:v}}))}/><div className="uss-partner-actions"><Button variant="secondary" disabled={blocked||orderDirty||!itemDirty||Object.keys(validation).length>0} onClick={()=>void mutate(()=>api.updateEditorSponsorship({eventId,relationId:id,expectedVersion:item.version,changes:value}),id)}>Save sponsorship for {item.partner.name}</Button><Button variant="danger" disabled={blocked||dirty} onClick={()=>setDetach(item)}>Detach {item.partner.name}</Button><Button variant="ghost" disabled={blocked||fieldsDirty||index===0||cursor!==null} onClick={()=>move(id,-1)}>Move {item.partner.name} up</Button><Button variant="ghost" disabled={blocked||fieldsDirty||index===order.length-1||cursor!==null} onClick={()=>move(id,1)}>Move {item.partner.name} down</Button></div></li>;})}</ol>
 {cursor&&<Button variant="secondary" disabled={blocked||dirty} onClick={()=>void load(eventId,true)}>Load more sponsorships</Button>}
 <p>Reorder requires the complete active set, at most 100 relationships, and current versions. Keyboard move controls are available; no drag action is required.</p><Button variant="secondary" disabled={blocked||fieldsDirty||!orderDirty||!exactRelationOrder(items,cursor,order)} onClick={()=>void saveOrder()}>Save event sponsorship order</Button>
 </>}
 </>}
 <Modal open={detach!==null} onClose={()=>{if(!busy)setDetach(null);}} title="Detach this sponsorship?" description="This marks the event relationship inactive. The canonical partner and logo MediaAsset remain intact." actions={<><Button variant="secondary" disabled={busy} onClick={()=>setDetach(null)}>Keep sponsorship</Button><Button variant="danger" loading={busy} onClick={()=>{if(detach)void mutate(()=>api.detachEditorSponsorship({eventId,relationId:detach.id,expectedVersion:detach.version}),detach.id);}}>Confirm detach</Button></>}>{detach!==null&&<p role="status">{notice}</p>}</Modal>
 </FormSection>;
}
