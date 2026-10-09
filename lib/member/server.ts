import "server-only";
import { cache } from "react";
import { getOwnMemberProfile } from "./profile-actions";
import { projectProfile } from "./profile-adapter";
/** Request-local projection of the existing authorized own-profile service. */
export const loadMember = cache(async () => projectProfile(await getOwnMemberProfile()));
