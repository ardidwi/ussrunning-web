import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import "./auth-notice.css";
import "./qr.css";
import "./home-motion.css";
import "./scroll-fix.css";

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
