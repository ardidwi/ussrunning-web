import "server-only";
import { cache } from "react";
import { getOwnMemberCardPresentation } from "@/lib/member/member-card-actions";
// Request-local only: never cache private card data across accounts/requests.
export const loadOwnMemberCard = cache(getOwnMemberCardPresentation);
