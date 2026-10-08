"use server";
import { signInWithEmail } from "@/app/login/actions";
import { isAuthConfigured } from "./server";
import {
  decodeAuthResult,
  type AuthOperation,
  type AuthResult,
} from "./contract";
import { safeReturnPath } from "./return-path";
// Existing provider login remains the only connected operation. BE-02/BE-03
// must supply provisioning/consent/verification before the other operations connect.
export async function runAuthOperation(
  operation: AuthOperation,
  input: FormData,
  returnTo?: string,
): Promise<AuthResult> {
  if (operation !== "login" || !isAuthConfigured())
    return { state: "error", code: "AUTH_UNAVAILABLE" };
  if (!(input instanceof FormData))
    return { state: "error", code: "VALIDATION_ERROR" };
  const result = await signInWithEmail({}, input);
  // Future structured backend results take precedence over this legacy bridge.
  if ("code" in result)
    return decodeAuthResult(
      { ...result, state: result.status === "error" ? "error" : "signed_in" },
      operation,
    );
  if (result.status === "success")
    return { state: "signed_in", returnTo: safeReturnPath(returnTo) };
  const legacyCodes: Record<string, AuthResult> = {
    "We couldn't confirm that email and password. Please check them and try again.":
      { state: "error", code: "INVALID_CREDENTIALS" },
    "Email and password are required.": {
      state: "error",
      code: "VALIDATION_ERROR",
    },
    "Please enter a valid email address.": {
      state: "error",
      code: "VALIDATION_ERROR",
    },
  };
  return (
    legacyCodes[result.message ?? ""] ?? {
      state: "error",
      code: "UNKNOWN_ERROR",
    }
  );
}
