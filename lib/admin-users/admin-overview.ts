import 'server-only';
import { query } from '@/lib/db';
import { getAuthorization } from '@/lib/authz/guards';
import { hasPermission, rolesForPermission, type Permission, type SystemRole } from '@/lib/authz/permissions';
import { pendingAvatarSql } from './avatar-queue-repository';
import type { AccountStatus } from '@/lib/db/types';

/** hidden: caller lacks the permission; unavailable: source missing (pending migration) or failing. */
export type OverviewMetric<T> = { state: 'ok'; value: T } | { state: 'unavailable' } | { state: 'hidden' };
export interface AdminOverview {
    membersByStatus: OverviewMetric<Record<AccountStatus, number>>;
    upcomingEvents: OverviewMetric<number>;
    avatarQueue: OverviewMetric<number>;
    failedNotifications: OverviewMetric<number>;
}
const STATUSES: readonly AccountStatus[] = ['pending_verification', 'active', 'suspended', 'deactivated'];
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;

async function metric<T>(roles: readonly SystemRole[], permission: Permission, read: () => Promise<T>): Promise<OverviewMetric<T>> {
    if (!hasPermission(roles, permission)) return { state: 'hidden' };
    try { return { state: 'ok', value: await read() }; }
    catch {
        // Missing tables/columns (42P01/42703) after an unapplied migration degrade to the same safe state as an outage.
        console.error('Admin overview metric unavailable');
        return { state: 'unavailable' };
    }
}
async function scalar(actor: string, permission: Permission, from: string): Promise<number> {
    const row = (await query<{ authorized: boolean; total: number }>(`WITH authority AS (${authority})
 SELECT EXISTS(SELECT 1 FROM authority) authorized, (SELECT count(*)::int ${from} AND EXISTS(SELECT 1 FROM authority)) total`, [actor, rolesForPermission(permission)]))[0];
    if (!row?.authorized) throw new Error('unauthorized');
    return row.total;
}

/** Bounded aggregate reads only; no PII. Each metric fails independently. */
export async function readAdminOverview(): Promise<AdminOverview> {
    const { account, roles } = await getAuthorization(), actor = account.id;
    const [membersByStatus, upcomingEvents, avatarQueue, failedNotifications] = await Promise.all([
        metric(roles, 'members.read', async () => {
            const rows = await query<{ authorized: boolean; status: AccountStatus | null; total: number }>(`WITH authority AS (${authority})
 SELECT EXISTS(SELECT 1 FROM authority) authorized, s.status, s.total FROM (SELECT 1) one
 LEFT JOIN (SELECT status, count(*)::int total FROM uss.accounts WHERE EXISTS(SELECT 1 FROM authority) GROUP BY status) s ON true`, [actor, rolesForPermission('members.read')]);
            if (!rows[0]?.authorized) throw new Error('unauthorized');
            const counts = Object.fromEntries(STATUSES.map(s => [s, 0])) as Record<AccountStatus, number>;
            for (const r of rows) if (r.status && STATUSES.includes(r.status)) counts[r.status] = r.total;
            return counts;
        }),
        metric(roles, 'events.manage', () => scalar(actor, 'events.manage',
            `FROM uss.events WHERE starts_at>=now() AND status IN ('published','registration_open','registration_closed')`)),
        metric(roles, 'members.photo.review', () => scalar(actor, 'members.photo.review',
            `FROM uss.member_profiles p JOIN uss.media_assets m ON m.id=p.avatar_media_id AND m.uploaded_by=p.account_id AND m.purpose='member_avatar' AND m.status='active'
 WHERE p.avatar_media_id IS NOT NULL AND p.avatar_reviewed_at IS NULL AND p.avatar_status IN ('approved','pending_review')`)),
        metric(roles, 'events.manage', () => scalar(actor, 'events.manage',
            `FROM uss.notification_deliveries WHERE status IN ('failed','bounced') AND cancelled_at IS NULL`)),
    ]);
    return { membersByStatus, upcomingEvents, avatarQueue, failedNotifications };
}
