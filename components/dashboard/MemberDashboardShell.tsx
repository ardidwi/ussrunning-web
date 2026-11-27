"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button, Modal, ToastProvider } from "@/components/ui";
import { PermissionGate } from "@/features/permissions/Permissions";
import { CMS_ACCESS } from "@/features/permissions/model";
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
  const [error, setError] = useState("");
  const lock = useRef(false);
  return (
    <>
    <Button
      variant="text"
      loading={pending}
      loadingLabel="Signing out…"
      onClick={() =>
        leave(() =>
          startTransition(async () => {
            if (lock.current) return;
            lock.current = true; setError("");
            try { await action(); } catch { setError("We couldn't sign you out. Please try again."); }
            finally { lock.current = false; }
          }),
        )
      }
    >
      Sign out
    </Button>
    {error && <p role="alert">{error}</p>}
    </>
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
    currentPath = activePath ?? pathname,
    path = currentPath.startsWith("/dashboard/registrations/")
      ? "/dashboard/events"
      : currentPath;
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
              <PermissionGate permission="events.manage">
                <Link
                  className="uss-member-back uss-scanner-nav"
                  href="/admin?module=check-in"
                  aria-current={
                    currentPath.startsWith("/dashboard/check-in")
                      ? "page"
                      : undefined
                  }
                >
                  Event check-in ↗
                </Link>
              </PermissionGate>
              <PermissionGate anyOf={CMS_ACCESS}>
                <Link className="uss-member-back" href="/admin">
                  USS CMS ↗
                </Link>
              </PermissionGate>
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
            <PermissionGate permission="events.manage">
              <Link
                className="uss-member-back uss-scanner-nav"
                href="/admin?module=check-in"
                aria-current={
                  currentPath.startsWith("/dashboard/check-in")
                    ? "page"
                    : undefined
                }
              >
                Event check-in ↗
              </Link>
            </PermissionGate>
            <PermissionGate anyOf={CMS_ACCESS}>
              <Link className="uss-member-back" href="/admin">
                USS CMS ↗
              </Link>
            </PermissionGate>
            {signOutAction && <MemberSignOut action={signOutAction} />}
          </Modal>
        </div>
      </MemberNavigationGuard>
    </ToastProvider>
  );
}
