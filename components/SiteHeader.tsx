"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const navItems = [
  ["RUNS", "/runs"],
  ["ABOUT", "/about"],
  ["MEMBERSHIP", "/membership"],
  ["STORIES", "/stories"],
  ["GALLERY", "/gallery"],
  ["PARTNERS", "/partners"],
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  function active(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }
  return (
    <>
      <header className="site-header uss-public-header">
        <div className="uss-public-header-inner">
          <Link
            href="/"
            className="uss-public-brand"
            aria-label="USS Running home"
          >
            <img src="/uss-logo.png" alt="USS" />
          </Link>
          <nav className="uss-public-nav" aria-label="Main navigation">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={active(href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <LinkButton
            href="/login"
            variant="navigation"
            className="uss-public-account"
          >
            MY USS ↗
          </LinkButton>
          <Button
            variant="ghost"
            className="uss-public-menu-trigger"
            aria-haspopup="dialog"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(true)}
          >
            MENU +
          </Button>
        </div>
      </header>
      <Modal
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="USS / MENU"
        className="uss-public-menu"
        actions={
          <Button variant="secondary" onClick={() => setMobileMenuOpen(false)}>
            Close navigation
          </Button>
        }
      >
        <nav aria-label="Mobile navigation">
          {[...navItems, ["MY USS", "/login"]].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {label}
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </nav>
      </Modal>
    </>
  );
}
