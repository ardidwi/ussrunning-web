import type { Metadata } from "next";
import "./globals.css";
import "./cms.css";
import { DemoProvider } from "@/components/cms/DemoProvider";

export const metadata: Metadata = {
  title: "USS Running — Community in Motion",
  description: "USS Running community platform MVP",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
