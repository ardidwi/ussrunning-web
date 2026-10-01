import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USS Running — Community in Motion",
  description: "USS Running community platform MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
