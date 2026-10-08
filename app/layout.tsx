import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "USS Running — Community in Motion",
  description: "USS Running community platform",
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
