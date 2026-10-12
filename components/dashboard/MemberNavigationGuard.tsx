"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "@/components/ui";
const GuardContext = createContext<{
  setDirty: (dirty: boolean) => void;
  leave: (action: () => void) => void;
}>({ setDirty: () => {}, leave: (action) => action() });
export const useMemberDirty = () => useContext(GuardContext).setDirty;
export const useMemberLeave = () => useContext(GuardContext).leave;
export default function MemberNavigationGuard({
  children,
  subject = "profile",
}: {
  children: ReactNode;
  subject?: string;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [destination, setDestination] = useState<(() => void) | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  const leave = useCallback(
    (action: () => void) => {
      if (dirty) setDestination(() => action);
      else action();
    },
    [dirty],
  );
  return (
    <GuardContext.Provider value={{ setDirty, leave }}>
      <div
        onClickCapture={(event) => {
          if (
            !dirty ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
          )
            return;
          const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
            "a[href]",
          );
          if (
            !link ||
            link.target === "_blank" ||
            link.hasAttribute("download")
          )
            return;
          const url = new URL(link.href);
          if (
            url.origin !== window.location.origin ||
            (url.pathname === window.location.pathname &&
              url.search === window.location.search)
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          setDestination(
            () => () => router.push(url.pathname + url.search + url.hash),
          );
        }}
      >
        {children}
      </div>
      <Modal
        open={destination !== null}
        onClose={() => setDestination(null)}
        title="Discard your changes?"
        description={`Your ${subject} changes haven't been saved. You can keep editing or leave without saving.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setDestination(null)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const path = destination;
                setDirty(false);
                setDestination(null);
                if (path) path();
              }}
            >
              Discard changes
            </Button>
          </>
        }
      />
    </GuardContext.Provider>
  );
}
