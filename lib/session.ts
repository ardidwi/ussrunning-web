import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { assertLegacyAccountNotBlocked } from "@/lib/auth/legacy-status";

export type AppRole = "member" | "admin" | "super_admin";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
};

function normalizeRole(role: unknown): AppRole {
  return role === "admin" || role === "super_admin" ? role : "member";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const { data: session } = await getAuth().getSession();
    const user = session?.user;
    if (!user?.id || !user.email) return null;
    await assertLegacyAccountNotBlocked(user.id);

    const configuredSuperAdmin = process.env.USS_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const email = user.email.toLowerCase();
    const role =
      configuredSuperAdmin && email === configuredSuperAdmin
        ? "super_admin"
        : normalizeRole((user as { role?: unknown }).role);

    return {
      id: user.id,
      email: user.email,
      name: user.name || user.email.split("@")[0],
      role,
    };
  } catch {
    return null;
  }
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
