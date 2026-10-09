import { membershipConfig } from "@/lib/membership-config";
import type { AuthPolicy } from "./contract";
// Whitelisted public validation rules only; no provider/environment credentials.
export function getClientAuthPolicy(): AuthPolicy {
  return {
    minimumPasswordLength: membershipConfig.minimumPasswordLength,
    maximumPasswordLength: membershipConfig.maximumPasswordLength,
    maximumNameLength: membershipConfig.maximumNameLength,
  };
}
