import { query } from "@/lib/db";

export async function writeAudit(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata: Record<string, unknown> = {}
) {
  await query(
    `INSERT INTO public.admin_activity(auth_user_id, action, entity_type, entity_id, metadata)
     VALUES($1,$2,$3,$4,$5::jsonb)`,
    [userId, action, entityType || null, entityId || null, JSON.stringify(metadata)]
  );
}
