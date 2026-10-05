import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import "./auth-notice.css";

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
