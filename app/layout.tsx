import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./cms.css";
import "./auth-notice.css";
import "./qr.css";
import "./home-motion.css";
import "./scroll-fix.css";
import "./prototype-refine.css";
import "@/components/ui/ui.css";
import "@/components/layout/public-shell.css";
import "@/components/auth/auth-flows.css";
import "@/components/dashboard/member-dashboard.css";
import "@/features/member-card/member-card.css";
import "@/features/member-dashboard/dashboard.css";
import "@/features/event-registration/registration.css";
import "@/features/event-pass/event-pass.css";
import "@/features/cms/cms-foundation.css";
import "@/features/check-in/check-in.css";
import "@/features/stories-cms/stories-cms.css";
import "@/features/gallery-cms/gallery-cms.css";
import "@/features/events-cms/events-cms.css";
import "@/features/partners-cms/partners-cms.css";
import "@/features/public-site/public-site.css";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_TAGLINE,
  siteUrl,
} from "@/features/seo/metadata";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  // No title template: existing member/admin pages already set full titles.
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
