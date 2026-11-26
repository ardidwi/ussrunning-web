// Purpose isolation: CMS content may only reference purpose='cms' media. Member avatars are
// signed exclusively through lib/member/avatar-storage.ts (members.lookup authority, quota, audit).
export const CMS_MEDIA_SETTING = 'uss.cms_mutation_code';
const VIOLATION = 'cms_media_purpose_violation';

/** Wraps a DB mutation function call so its result code is visible to the guard statement. */
export function recordMutationCode(call: string) {
  return `SELECT set_config('${CMS_MEDIA_SETTING}',${call},true) code`;
}

/**
 * Second statement in the mutation transaction. When the mutation returned OK but the stored row now
 * references non-CMS media, the uuid cast fails and the whole transaction rolls back. Evaluating it
 * after the mutation keeps check order identical to an unknown media id, so the response never
 * reveals that a member avatar exists.
 */
export function nonCmsReferenceGuard(ids: string, guardedOperation: string) {
  return `SELECT (x.id::text||':${VIOLATION}')::uuid FROM uss.media_assets x WHERE current_setting('${CMS_MEDIA_SETTING}',true)='OK' AND ${guardedOperation} AND x.id=ANY(${ids}) AND x.purpose<>'cms'`;
}

export function isPurposeViolation(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).includes(VIOLATION);
}
