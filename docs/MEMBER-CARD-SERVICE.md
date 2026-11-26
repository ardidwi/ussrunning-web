# BE-05 Member Card service

> Go-live completion rules, member numbers and private photos are documented in the [Member Identity handover](MEMBER-IDENTITY-HANDOVER.md). The sections below record the original service foundation.

Builds on BE-04 without new identities, schema, routes, rendering or provider changes.

FE-04 calls `getOwnMemberCardPresentation()` in lib/member/member-card-actions.ts. Result is `{ok:true,code:"MEMBER_CARD_AVAILABLE",data}` or the existing safe profile/auth failure code. Data contains displayName, memberId, barcode `{value,formatVersion:1}`, status and nullable existing safe AvatarDTO. No email/contact/provider/session/role data. Display name prefers profile name, then account display name, then Member ID. Render names as escaped text.

Version 1 encodes the existing **USS-uppercase-UUID-v4 barcode value verbatim**. It is independent from the Member ID, stable forever, opaque and non-PII. Protocol constant/validator live only in barcode-contract.ts. Do not add a prefix or encode the entire DTO. Neither barcode nor printed/downloaded card authorizes authentication, permissions or attendance; scanners must separately authenticate staff and validate current server state. A downloaded card is a historical presentation, never proof of current active status.

Only authenticated active verified owner access is permitted. Pending returns EMAIL_NOT_VERIFIED, suspended ACCOUNT_SUSPENDED, deactivated ACCOUNT_DEACTIVATED, anonymous UNAUTHENTICATED. No account ID input. Fresh DB status is rechecked using BE-04's shared joined read, no duplicate lookup/engine/cache. Missing profile and unavailable DB reuse controlled errors. Reads never write/rotate identity. BE-04's getOwnMemberCard action remains a compatibility adapter with its unchanged flat barcodeValue DTO; its type derives from the canonical presentation DTO.

Screen, print and future export consume the same data; no download credential/token is generated. FE owns visual barcode/logo/quiet zones/scan testing. Backend format version describes payload protocol, not a prescribed image symbology.

Future reissue requires an approved security/admin workflow, auditable old-to-new alias/revocation history and explicit migration of current immutable schema. No automatic rotation or ambiguous overwrite. An exposed barcode is an identifier, not a credential compromise. Existing schema does not support reissue; do not circumvent identity triggers. Future protocol versions must retain v1 decoding and established identities through a reviewed transition.

No migration/index/grant is needed. Legacy public IDs require the documented reviewed crosswalk before cutover; no historical IDs are replaced here. Real Neon session/transport, privileges and FE scan/export rehearsal remain staging work.
