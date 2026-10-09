import type { HistoryResult } from "@/lib/history/errors";
import type {
  RevisionPage,
  RevisionDetail,
} from "@/lib/revisions/revision-types";
import { REVISION_ENTITIES, HISTORY_POLICY } from "@/lib/history/policy";
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
const labels: Record<string, string> = {
  headline: "Headline",
  description: "Description",
  ctaLabel: "Action label",
  title: "Title",
  slug: "Slug",
  excerpt: "Excerpt",
  status: "Status",
  featured: "Featured",
  sponsored: "Sponsored",
  name: "Name",
  visible: "Visible",
  summary: "Summary",
  startsAt: "Starts at",
  endsAt: "Ends at",
  timezone: "Timezone",
  venueName: "Venue",
};
export function RevisionHistory({
  result,
  detail,
  query,
}: {
  result: HistoryResult<RevisionPage> | null;
  detail?: HistoryResult<RevisionDetail>;
  query: Query;
}) {
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / READ-ONLY HISTORY</p>
        <h1>REVISION PREVIEWS.</h1>
        <p>
          Partial previews of recorded changes. They do not represent complete
          versions and cannot be restored here.
        </p>
      </header>
      <form
        action="/admin"
        method="get"
        noValidate
        className="uss-history-filters"
      >
        <input type="hidden" name="module" value="revisions" />
        <Field
          label="Entity"
          hint="Choose the kind of content whose history you want to view."
          required
        >
          <Select
            name="entity"
            defaultValue={text(query, "entity") || "story"}
            required
          >
            {REVISION_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {entityLabels[e]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Record reference"
          hint="Use the internal record reference supplied by the content editor."
          required
        >
          <Input
            name="entityId"
            defaultValue={text(query, "entityId")}
            placeholder="Record UUID"
            required
            maxLength={36}
          />
        </Field>
        <Field
          label="Page size"
          hint={`Default ${HISTORY_POLICY.defaultLimit}; maximum ${HISTORY_POLICY.maxLimit}.`}
        >
          <Select name="limit" defaultValue={text(query, "limit") || "25"}>
            {[25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} previews
              </option>
            ))}
          </Select>
        </Field>
        <FormActions
          cancel={
            <LinkButton href="/admin?module=revisions" variant="secondary">
              Reset
            </LinkButton>
          }
        >
          <Button type="submit">View history</Button>
        </FormActions>
      </form>
      {result === null ? (
        <EmptyState
          title="Choose a record to view its history."
          description="Open history from an audit entry, or enter a record reference."
        />
      ) : !result.ok ? (
        <ServiceFeedback
          code={result.code}
          returnTo="/admin?module=revisions"
        />
      ) : (
        <>
          {detail &&
            (!detail.ok ? (
              <ServiceFeedback
                code={detail.code}
                returnTo="/admin?module=revisions"
              />
            ) : (
              <section
                className="uss-history-preview"
                aria-label="Revision preview"
              >
                <h2>
                  Revision preview · Version {detail.data.metadata.version}
                </h2>
                <p>
                  Partial snapshot preview. This view excludes full article
                  bodies and other data.
                </p>
                {Object.values(detail.data.snapshot).some(
                  (v) => v !== undefined,
                ) ? (
                  <dl>
                    {Object.entries(detail.data.snapshot)
                      .filter(([, v]) => v !== undefined)
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt>{labels[key] || "Preview field"}</dt>
                          <dd>
                            {typeof value === "boolean"
                              ? value
                                ? "Yes"
                                : "No"
                              : value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : (
                  <p>No preview fields are available for this revision.</p>
                )}
              </section>
            ))}
          {result.data.items.length ? (
            <ol className="uss-history-list">
              {result.data.items.map((item) => (
                <li key={item.id}>
                  <article>
                    <h2>
                      Version {item.version} · {item.action}
                    </h2>
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
                        <dt>When</dt>
                        <dd>
                          <time dateTime={item.occurredAt}>
                            {historyTime(item.occurredAt)}
                          </time>
                        </dd>
                      </div>
                    </dl>
                    <LinkButton
                      variant="secondary"
                      href={historyHref("revisions", {
                        entity: result.data.entity,
                        entityId: text(query, "entityId"),
                        limit: text(query, "limit") || 25,
                        cursor: text(query, "cursor"),
                        revisionId: item.id,
                      })}
                    >
                      View revision preview
                    </LinkButton>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No revisions recorded yet."
              description="Recorded revisions will appear here when this record has history."
            />
          )}
          <div className="uss-history-page-actions">
            {text(query, "cursor") && (
              <LinkButton
                variant="secondary"
                href={historyHref("revisions", {
                  entity: result.data.entity,
                  entityId: text(query, "entityId"),
                  limit: text(query, "limit") || 25,
                })}
              >
                First page
              </LinkButton>
            )}
            {result.data.nextCursor && (
              <LinkButton
                variant="secondary"
                href={historyHref("revisions", {
                  entity: result.data.entity,
                  entityId: text(query, "entityId"),
                  limit: text(query, "limit") || 25,
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
