"use server";
import { runAuthOperation } from "@/lib/auth/flow-actions";
import { authMessages } from "@/lib/auth/auth-errors";
export type LoginState = { status?: "success" | "error"; message?: string };
/** Legacy caller compatibility; the single production auth flow owns session/account gating. */
export async function signInWithEmail(_state: LoginState, form: FormData): Promise<LoginState> {
 const input=new FormData(); input.set("email",String(form.get("email")??""));input.set("password",String(form.get("password")??""));
 const result=await runAuthOperation("login",input);
 return result.state==="signed_in"?{status:"success",message:"Signed in."}:{status:"error",message:result.state==="error"?authMessages[result.code]:authMessages.EMAIL_NOT_VERIFIED};
}
