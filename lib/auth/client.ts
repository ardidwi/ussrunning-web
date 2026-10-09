import { runAuthOperation } from "./flow-actions";
import { decodeAuthResult, type AuthAdapter } from "./contract";
export const authAdapter: AuthAdapter = async (operation, input) => {
  const data = new FormData();
  // Unconnected operations send no credentials or profile data. BE-02 owns
  // their future request shape and validation; never send unsupported fields.
  if (operation === "login") {
    data.set("email", input.email ?? "");
    data.set("password", input.password ?? "");
  }
  return decodeAuthResult(
    await runAuthOperation(operation, data, input.returnTo),
    operation,
  );
};
