"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Account, CmsState, seed, STORAGE_KEY } from "@/lib/cms";
type Context = {
  state: CmsState;
  ready: boolean;
  error: string;
  account: Account | null;
  select: (id: string) => void;
  update: (change: (s: CmsState) => CmsState, action: string) => boolean;
};
const DemoContext = createContext<Context | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CmsState>(seed);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if (
          value.version !== 1 ||
          !Array.isArray(value.accounts) ||
          !Array.isArray(value.stories) ||
          !value.published
        )
          throw Error();
        setState(value);
      }
      setSelected(sessionStorage.getItem("uss-demo-account"));
    } catch {
      setError(
        "Data demo tidak dapat dibaca. Gunakan browser lain untuk mencoba.",
      );
    }
    setReady(true);
  }, []);
  function select(id: string) {
    setSelected(id);
    try {
      sessionStorage.setItem("uss-demo-account", id);
    } catch {
      setError("Browser tidak dapat menyimpan sesi demo.");
    }
  }
  function update(change: (s: CmsState) => CmsState, action: string) {
    try {
      const next = change(structuredClone(state));
      next.activity = [
        {
          id: crypto.randomUUID(),
          actor: state.accounts.find((a) => a.id === selected)?.name || "Demo",
          action,
          at: new Date().toISOString(),
        },
        ...next.activity,
      ].slice(0, 30);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setState(next);
      setError("");
      return true;
    } catch {
      setError(
        "Perubahan belum tersimpan. Penyimpanan browser mungkin penuh atau tidak tersedia. Kurangi ukuran gambar lalu coba lagi.",
      );
      return false;
    }
  }
  return (
    <DemoContext.Provider
      value={{
        state,
        ready,
        error,
        account: state.accounts.find((a) => a.id === selected) || null,
        select,
        update,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const value = useContext(DemoContext);
  if (!value) throw Error("DemoProvider missing");
  return value;
}
