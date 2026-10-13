export const HISTORY_POLICY = { defaultLimit: 25, maxLimit: 100, defaultDays: 30, maxDays: 366, maxInputBytes: 4096, maxCursorBytes: 512 } as const;
export const REVISION_ENTITIES = ["site_content", "story", "partner", "event"] as const;
export type RevisionEntity = typeof REVISION_ENTITIES[number];
/** Admin may see only these positive-listed content operations, never account/security logs. */
export const OPERATIONAL_ACTIONS = ["created", "updated", "published", "scheduled", "archived", "restored"] as const;
export const OPERATIONAL_AUDIT_ACTIONS = REVISION_ENTITIES.flatMap(entity => OPERATIONAL_ACTIONS.map(action => `${entity}.${action}`));

// Partner/Sponsor lifecycle and sponsorship operations, additive to existing history policy.
OPERATIONAL_AUDIT_ACTIONS.push('partner.activated','partner.deactivated',...['attach','update','detach','reorder'].map(action=>`partner.event.${action}`));

OPERATIONAL_AUDIT_ACTIONS.push('site_content.unpublished');

OPERATIONAL_AUDIT_ACTIONS.push('notification.cancelled','notification.retry_requested');
