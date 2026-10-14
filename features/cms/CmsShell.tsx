"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Modal } from "@/components/ui";
import { CMS_MODULES, type CmsModule } from "./navigation";
import { usePermissions } from "@/features/permissions/Permissions";
import MemberNavigationGuard from "@/components/dashboard/MemberNavigationGuard";
export function CmsShell({
  module,
  children,
  displayName,
}: {
  module: CmsModule;
  children: ReactNode;
  displayName: string;
}) {
  const access = usePermissions(),
    [open, setOpen] = useState(false);
  const navigation = (mobile = false) => (
    <nav
      aria-label={mobile ? "Mobile CMS navigation" : "CMS navigation"}
      className="uss-member-nav"
    >
      {CMS_MODULES.filter((item) => access.canAny(item.permissions)).map(
        (item) => (
          <Link
            key={item.id}
            href={`/admin?module=${item.id}`}
            aria-current={module === item.id ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
            <span aria-hidden="true">↗</span>
          </Link>
        ),
      )}
    </nav>
  );
  return <MemberNavigationGuard subject={module === "events" ? "Event" : module === "gallery" ? "Gallery" : module === "stories" ? "Story" : "workspace"}>
    <div className="uss-member-shell uss-cms-foundation">
      <a className="uss-member-skip" href="#cms-content">
        Skip to content
      </a>
      <header className="uss-member-header">
        <Link href="/" aria-label="USS Running home">
          <img src="/uss-logo.png" alt="USS Running" width="120" height="42" />
        </Link>
        <span className="uss-member-kicker">CONTROL ROOM / USS RUNNING</span>
        <Button
          className="uss-member-menu"
          variant="secondary"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Menu
        </Button>
      </header>
      <div className="uss-member-layout">
        <aside className="uss-member-sidebar">
          <p className="uss-member-kicker">USS CMS</p>
          {navigation()}
          <Link href="/dashboard" className="uss-member-back">
            Back to MY USS ↗
          </Link>
        </aside>
        <main id="cms-content" className="uss-member-content" tabIndex={-1}>
          <p className="uss-member-kicker">{displayName}</p>
          {children}
        </main>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="USS CMS">
        {navigation(true)}
        <Link
          href="/dashboard"
          className="uss-member-back"
          onClick={() => setOpen(false)}
        >
          Back to MY USS ↗
        </Link>
      </Modal>
    </div>
  </MemberNavigationGuard>;
}
