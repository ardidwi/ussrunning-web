"use server";
import { revalidatePath } from "next/cache";
import * as partners from "@/lib/partners/partner-actions";
import { getManagedEventList } from "@/lib/events/event-actions";
async function mutation<T>(pending:Promise<partners.PartnerResult<T>>){const r=await pending;if(r.ok)revalidatePath("/admin");return r;}
export async function createEditorPartner(value:unknown){return mutation(partners.createPartner(value));}
export async function updateEditorPartner(value:unknown){return mutation(partners.updatePartner(value));}
export async function activateEditorPartner(value:unknown){return mutation(partners.activatePartner(value));}
export async function deactivateEditorPartner(value:unknown){return mutation(partners.deactivatePartner(value));}
export async function archiveEditorPartner(value:unknown){return mutation(partners.archivePartner(value));}
export async function readEditorPartner(value:unknown){return partners.getManagedPartner(value);}
export async function listEditorPartners(value:unknown){return partners.listManagedPartners(value);}
export async function listEditorSponsorships(value:unknown){return partners.listManagedEventPartners(value);}
export async function attachEditorSponsorship(value:unknown){return mutation(partners.attachPartnerToEvent(value));}
export async function updateEditorSponsorship(value:unknown){return mutation(partners.updateEventPartner(value));}
export async function detachEditorSponsorship(value:unknown){return mutation(partners.detachPartnerFromEvent(value));}
export async function reorderEditorSponsorships(value:unknown){return mutation(partners.reorderEventPartners(value));}
export async function readPartnerEvents(cursor?:string){const r=await getManagedEventList({limit:20,...(cursor?{cursor}:{})});return r.ok?{ok:true as const,data:{items:r.data.items.map(({id,title,status})=>({id,title,status})),nextCursor:r.data.nextCursor}}:r;}
