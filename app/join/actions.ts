"use server";
import { runAuthOperation } from "@/lib/auth/flow-actions";
import { authMessages } from "@/lib/auth/auth-errors";
export type JoinField="firstName"|"lastName"|"email"|"mobile"|"city"|"instagram"|"emergencyContactName"|"emergencyContactMobile"|"password"|"confirmPassword"|"acceptLegal";
export type JoinState={status?:"success"|"error";message?:string;memberCode?:string;fieldErrors?:Partial<Record<JoinField,string>>};
/** Old callers cannot mint legacy profiles/identities; delegate the same typed production flow. */
export async function createMember(_state:JoinState,form:FormData):Promise<JoinState>{
 const input=new FormData(); for(const key of ["email","password","confirmPassword"])input.set(key,String(form.get(key)??""));
 input.set("fullName",String(form.get("fullName")??[form.get("firstName"),form.get("lastName")].filter(Boolean).join(" ")));
 input.set("consent",String(form.get("consent")==="true"||form.get("acceptLegal")==="on"));
 const result=await runAuthOperation("register",input);
 return result.state==="verification_required"?{status:"success",message:"Account created; email verification is required before it becomes active."}:{status:"error",message:result.state==="error"?authMessages[result.code]:"Your account is not active yet."};
}
