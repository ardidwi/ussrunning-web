"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  decodeAuthResult,
  type AuthAdapter,
  type AuthInput,
  type AuthOperation,
  type AuthResult,
} from "@/lib/auth/contract";
export type RequestState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "settled"; result: AuthResult };
export function useAuthRequest(adapter: AuthAdapter) {
  const [state, setState] = useState<RequestState>({ phase: "idle" });
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const submit = useCallback(
    async (operation: AuthOperation, input: AuthInput) => {
      if (busy.current) return;
      busy.current = true;
      setState({ phase: "submitting" });
      let result: AuthResult;
      try {
        result = decodeAuthResult(await adapter(operation, input), operation);
      } catch {
        result = { state: "error", code: "NETWORK_ERROR" };
      } finally {
        busy.current = false;
      }
      if (mounted.current) setState({ phase: "settled", result });
      return result;
    },
    [adapter],
  );
  return {
    state,
    submit,
    clear: () => {
      if (!busy.current) setState({ phase: "idle" });
    },
  };
}
