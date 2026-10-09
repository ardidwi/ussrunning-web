import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getAuthorization } from "@/lib/authz/guards";
import { query } from "@/lib/db";


export type AppRole = "member" | "admin" | "super_admin";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

/** Legacy action compatibility: provider identity, USS status and DB-owned roles. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const user = await requireAuthenticatedUser();
    const { account, roles } = await getAuthorization();
    const role: AppRole = roles.includes("super_admin") ? "super_admin" : roles.includes("admin") ? "admin" : "member";
    return { id: user.providerUserId, email: account.email, name: account.displayName || user.name || account.email.split("@")[0], role };
  } catch { return null; }
}
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "super_admin") {
    redirect("/dashboard");
  }
  return user;
}

export async function ensureProfile(user: CurrentUser) {
  const rows = await query<{
    auth_user_id: string;
    member_code: string;
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    city: string | null;
    instagram: string | null;
    emergency_contact_name: string | null;
    emergency_contact_mobile: string | null;
    avatar_url: string | null;
    joined_at: string;
  }>(
    `INSERT INTO public.user_profiles(auth_user_id, first_name, last_name)
     VALUES($1, $2, NULL)
     ON CONFLICT (auth_user_id) DO NOTHING
     RETURNING auth_user_id, member_code, first_name, last_name, mobile, city, instagram, emergency_contact_name, emergency_contact_mobile, avatar_url, joined_at`,
    [user.id, user.name]
  );

  if (rows[0]) return rows[0];

  const existing = await query<{
    auth_user_id: string;
    member_code: string;
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    city: string | null;
    instagram: string | null;
    emergency_contact_name: string | null;
    emergency_contact_mobile: string | null;
    avatar_url: string | null;
    joined_at: string;
  }>(
    `SELECT auth_user_id, member_code, first_name, last_name, mobile, city, instagram, emergency_contact_name, emergency_contact_mobile, avatar_url, joined_at
     FROM public.user_profiles
     WHERE auth_user_id = $1
     LIMIT 1`,
    [user.id]
  );

  return existing[0];
}
