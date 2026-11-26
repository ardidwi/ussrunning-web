import { PageHero } from "@/components/layout/PageHero";
import { LinkButton } from "@/components/ui/Button";

/** Branded "temporarily unavailable" state for public detail pages (service failure, not 404). */
export function PublicUnavailable({
  kicker,
  message,
  backHref,
  backLabel,
}: {
  kicker: string;
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <PageHero
      kicker={<>{kicker} / TEMPORARILY UNAVAILABLE</>}
      title={
        <>
          BACK IN
          <br />
          A MOMENT.
        </>
      }
      description={<span role="status">{message}</span>}
    >
      <div className="uss-not-found-actions">
        <LinkButton href={backHref} variant="secondary">
          {backLabel} ↗
        </LinkButton>
        <LinkButton href="/" variant="text">
          Home ↗
        </LinkButton>
      </div>
    </PageHero>
  );
}
