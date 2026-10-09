"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Button, Modal, ToastProvider } from "@/components/ui";
import MemberNavigationGuard, { useMemberLeave } from "./MemberNavigationGuard";
const navigation = [
  ["/dashboard", "Overview"],
  ["/dashboard/profile", "Profile"],
  ["/dashboard/member-card", "Member Card"],
  ["/dashboard/events", "Events"],
  ["/dashboard/settings", "Settings"],
];
function MemberSignOut({ action }: { action: () => Promise<void> }) {
  const leave = useMemberLeave();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="text"
      loading={pending}
      loadingLabel="Signing out…"
      onClick={() =>
        leave(() =>
          startTransition(async () => {
            await action();
          }),
        )
      }
    >
      Sign out
    </Button>
  );
}
export default function MemberDashboardShell({
  children,
  activePath,
  signOutAction,
}: {
  children: ReactNode;
  activePath?: string;
  signOutAction?: () => Promise<void>;
}) {
  const pathname = usePathname(),
    path = activePath ?? pathname;
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const links = (mobile = false) => (
    <nav
      aria-label={mobile ? "Mobile member navigation" : "Member navigation"}
      className="uss-member-nav"
    >
      {navigation.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          onClick={(event) => {
            if (!event.defaultPrevented) setOpen(false);
          }}
        >
          {label}
          <span aria-hidden="true">↗</span>
        </Link>
      ))}
    </nav>
  );
  return (
    <ToastProvider>
      <MemberNavigationGuard>
        <div className="uss-member-shell">
          <a className="uss-member-skip" href="#member-content">
            Skip to content
          </a>
          <header className="uss-member-header">
            <Link href="/" aria-label="USS Running home">
              <img
                src="/uss-logo.png"
                alt="USS Running"
                width="120"
                height="42"
              />
            </Link>
            <span className="uss-member-kicker">
              MY USS / COMMUNITY IN MOTION
            </span>
            <Button
              variant="secondary"
              className="uss-member-menu"
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpen(true)}
            >
              Menu
            </Button>
          </header>
          <div className="uss-member-layout">
            <aside className="uss-member-sidebar">
              <p className="uss-member-kicker">YOUR USS</p>
              {links()}
              <Link className="uss-member-back" href="/">
                Back to USS Running ↗
              </Link>
              {signOutAction && <MemberSignOut action={signOutAction} />}
            </aside>
            <main
              id="member-content"
              className="uss-member-content"
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="MY USS"
            description="Your profile, membership and activities."
          >
            {links(true)}
            <Link
              className="uss-member-back"
              href="/"
              onClick={(event) => {
                if (!event.defaultPrevented) setOpen(false);
              }}
            >
              Back to USS Running ↗
            </Link>
            {signOutAction && <MemberSignOut action={signOutAction} />}
          </Modal>
        </div>
      </MemberNavigationGuard>
    </ToastProvider>
  );
}
