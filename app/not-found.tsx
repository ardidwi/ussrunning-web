import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHero } from "@/components/layout/PageHero";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: { absolute: "Page not found — USS Running" },
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="page-black">
      <SiteHeader />
      <PageHero
        kicker={<>404 / OFF ROUTE</>}
        title={
          <>
            WRONG TURN.
            <br />
            NO STRESS.
          </>
        }
        description={
          <>
            This page moved, was unpublished or never existed. Find the next run,
            catch up on stories or head back to the start line.
          </>
        }
      >
        <div className="uss-not-found-actions">
          <LinkButton href="/">Back to home ↗</LinkButton>
          <LinkButton href="/runs" variant="secondary">
            See upcoming runs ↗
          </LinkButton>
          <LinkButton href="/stories" variant="text">
            Read stories ↗
          </LinkButton>
        </div>
      </PageHero>
      <SiteFooter />
    </main>
  );
}
