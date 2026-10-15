"use client";
import { Field,Input } from "@/components/ui";
import type { RelationContent } from "@/lib/partners/partner-types";
export function PartnerValidityFields({value,onChange,disabled,errors={},prefix="partner"}:{value:RelationContent|Pick<RelationContent,"tier"|"activeFrom"|"activeUntil">;onChange:(key:"tier"|"activeFrom"|"activeUntil",value:string|null)=>void;disabled:boolean;errors?:Record<string,string>;prefix?:string}){return <div className="uss-partner-grid">
 <Field id={`${prefix}-tier`} label="Tier token" hint="Optional normalized tier code, such as community. This is not a fixed sponsor taxonomy." error={errors.tier}><Input name="tier" value={value.tier??""} disabled={disabled} maxLength={40} onChange={e=>onChange("tier",e.target.value||null)}/></Field>
 {(["activeFrom","activeUntil"] as const).map(key=><Field key={key} id={`${prefix}-${key}`} label={key==="activeFrom"?"Active from":"Active until"} hint="Optional full timestamp with seconds and explicit UTC offset. Example: 2026-11-01T09:00:00+07:00." error={errors[key]}><Input name={key} value={value[key]??""} disabled={disabled} placeholder="YYYY-MM-DDTHH:mm:ss+07:00" maxLength={40} onChange={e=>onChange(key,e.target.value||null)}/></Field>)}
 </div>;}
