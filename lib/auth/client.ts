import { runAuthOperation } from "./flow-actions";
import { decodeAuthResult, type AuthAdapter } from "./contract";
export const authAdapter: AuthAdapter = async (operation, input) => {
  const data = new FormData();
  const fields = { login: ["email","password"], register: ["email","password","confirmPassword","fullName","consent"], verify: ["token"], resend: [], forgot: ["email"], reset: ["password","confirmPassword","token"] } as const;
  for (const key of fields[operation]) data.set(key, String(input[key] ?? ""));
  return decodeAuthResult(
    await runAuthOperation(operation, data, input.returnTo),
    operation,
  );
};
