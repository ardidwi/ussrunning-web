import type { HistoryResult } from "@/lib/history/errors";
import type { AuditPage } from "@/lib/audit/audit-types";
import { HISTORY_POLICY, REVISION_ENTITIES } from "@/lib/history/policy";
import {
  Field,
  Input,
  Select,
  FormActions,
  Button,
  LinkButton,
  EmptyState,
} from "@/components/ui";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import {
  entityLabels,
  historyHref,
  historyTime,
  text,
  type Query,
} from "./query";
export function AuditHistory({
  result,
  query,
  allCategories,
}: {
  result: HistoryResult<AuditPage>;
  query: Query;
  allCategories: boolean;
}) {
  const filters = (
    <form
      action="/admin"
      method="get"
      noValidate
      className="uss-history-filters"
    >
      <input type="hidden" name="module" value="activity" />
      <Field
        label="From date"
        hint="UTC calendar date. Leave both dates empty for the default 30-day window."
      >
        <Input
          type="date"
          name="fromDate"
          defaultValue={text(query, "fromDate")}
        />
      </Field>
      <Field
        label="Until date"
        hint={`UTC calendar date, inclusive. Maximum ${HISTORY_POLICY.maxDays} days per request.`}
      >
        <Input
          type="date"
          name="untilDate"
          defaultValue={text(query, "untilDate")}
        />
      </Field>
      <Field
        label="Entity type"
        hint={
          allCategories
            ? "Filter a history category or view all permitted categories."
            : "Operational content history permitted for your account."
        }
      >
        <Select name="entityType" defaultValue={text(query, "entityType")}>
          <option value="">All permitted categories</option>
          {REVISION_ENTITIES.map((e) => (
            <option key={e} value={e}>
              {entityLabels[e]}
            </option>
          ))}
          {allCategories && (
            <>
              <option value="account">Account</option>
              <option value="member_profile">Member profile</option>
            </>
          )}
        </Select>
      </Field>
      <Field
        label="Action"
        hint="Optional exact action name, for example story.published."
      >
        <Input
          name="action"
          defaultValue={text(query, "action")}
          placeholder="story.published"
          maxLength={80}
        />
      </Field>
      <Field
        label="Page size"
        hint={`Default ${HISTORY_POLICY.defaultLimit}; maximum ${HISTORY_POLICY.maxLimit}.`}
      >
        <Select
          name="limit"
          defaultValue={
            text(query, "limit") || String(HISTORY_POLICY.defaultLimit)
          }
        >
          {[25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} entries
            </option>
          ))}
        </Select>
      </Field>
      <FormActions
        cancel={
          <LinkButton href="/admin?module=activity" variant="secondary">
            Reset filters
          </LinkButton>
        }
      >
        <Button type="submit">Apply filters</Button>
      </FormActions>
    </form>
  );
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / READ-ONLY HISTORY</p>
        <h1>AUDIT HISTORY.</h1>
        <p>
          {allCategories
            ? "Account and content activity permitted for your account."
            : "Operational content activity permitted for your account."}
        </p>
      </header>
      {filters}
      {!result.ok ? (
        <ServiceFeedback code={result.code} returnTo="/admin?module=activity" />
      ) : (
        <>
          <p className="uss-history-window">
            Window: {historyTime(result.data.window.from)} —{" "}
            {historyTime(result.data.window.until)}. Dates above filter UTC
            calendar days.
          </p>
          {result.data.items.length ? (
            <ol className="uss-history-list">
              {result.data.items.map((item) => (
                <li key={item.id}>
                  <article>
                    <h2>{item.action.replaceAll(".", " / ")}</h2>
                    <dl>
                      <div>
                        <dt>Actor</dt>
                        <dd>
                          {item.actor
                            ? item.actor.displayName || "USS account"
                            : "System"}
                        </dd>
                      </div>
                      <div>
                        <dt>Entity</dt>
                        <dd>{item.entityType.replaceAll("_", " ")}</dd>
                      </div>
                      <div>
                        <dt>Changed fields</dt>
                        <dd>
                          {item.metadata.changedFields.length
                            ? item.metadata.changedFields.join(", ")
                            : "No field names recorded"}
                        </dd>
                      </div>
                      <div>
                        <dt>When</dt>
                        <dd>
                          <time dateTime={item.occurredAt}>
                            {historyTime(item.occurredAt)}
                          </time>
                        </dd>
                      </div>
                    </dl>
                    {REVISION_ENTITIES.includes(
                      item.entityType as (typeof REVISION_ENTITIES)[number],
                    ) &&
                      item.entityId &&
                      item.revisionId && (
                        <LinkButton
                          href={historyHref("revisions", {
                            entity: item.entityType,
                            entityId: item.entityId,
                            revisionId: item.revisionId,
                          })}
                          variant="text"
                        >
                          View revision preview ↗
                        </LinkButton>
                      )}
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No activity in this window."
              description="Try a different date range or reset the filters."
            />
          )}
          <div className="uss-history-page-actions">
            {text(query, "cursor") && (
              <LinkButton
                variant="secondary"
                href={historyHref("activity", {
                  limit: text(query, "limit") || 25,
                  action: text(query, "action"),
                  entityType: text(query, "entityType"),
                  from: result.data.window.from,
                  until: result.data.window.until,
                })}
              >
                First page
              </LinkButton>
            )}
            {result.data.nextCursor && (
              <LinkButton
                variant="secondary"
                href={historyHref("activity", {
                  limit: text(query, "limit") || 25,
                  action: text(query, "action"),
                  entityType: text(query, "entityType"),
                  from: result.data.window.from,
                  until: result.data.window.until,
                  cursor: result.data.nextCursor,
                })}
              >
                Next page →
              </LinkButton>
            )}
          </div>
        </>
      )}
    </>
  );
}
