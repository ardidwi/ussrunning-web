# USS workspace UX contract

Business source: docs/CMS-FOUNDATION.md, current user decisions 2026-10-02. Roles and account barcode are user requested; production authorization remains deferred.

## Canonical UI Map

| Capability     | Canonical owner                        | Source of truth                         | Allowed variants      | Verification                |
| -------------- | -------------------------------------- | --------------------------------------- | --------------------- | --------------------------- |
| Form           | components/cms/Controls.tsx Field      | This contract                           | text, textarea        | Typecheck + browser         |
| Select/Listbox | Native select                          | Platform popup accepted for phone usage | role, status          | Browser keyboard            |
| Scrollbar      | app/cms.css                            | DESIGN.md runtime mapping               | horizontal navigation | narrow viewport             |
| Toast          | Workspace live status + provider error | This contract                           | success, error        | Save and storage failure    |
| CRUD           | DemoProvider update                    | docs/CMS-FOUNDATION.md                  | local demo            | Stories create/edit/archive |
| Date           | Text event date                        | demo event scaffold                     | string                | no calendar promises        |

## Behavior

Public pages remain accessible. Preview role selector is clearly labeled demo. Member sees own profile and identity; CMS blocks member view and super admin alone sees user management. This is UI demonstration, never authorization. Production server routes must fail closed until session verification exists.
Story saves return to list; validation preserves values; archive is reversible through edit. Editing story forms can be cancelled explicitly; draft text is not auto persisted until Save Story. Website draft edits save immediately in browser; publish copies draft to local public preview. Upload errors preserve prior images and allow retry. Local storage errors are visible and no successful save is announced. State is intentionally device-local; no promise of remote publishing.
No hard-delete actions. No native confirm/alert dialogs. Real registration and check-in remain unavailable. Search is synchronous over capped local demo list, with explicit clear. Activity limited to 30 rows. Browser locale controls select geometry; owned copy is Indonesian and time display uses Asia/Jakarta.
