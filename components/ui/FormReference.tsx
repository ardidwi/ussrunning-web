"use client";

import { useState } from "react";
import {
  Field,
  Input,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  Switch,
  FormSection,
  FormActions,
  Button,
  Modal,
  ToastProvider,
  useToast,
  Skeleton,
  PageLoading,
  EmptyState,
  Badge,
} from "./index";

function Reference() {
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [radio, setRadio] = useState("community");
  const notify = useToast();
  return (
    <main className="uss-reference">
      <h1>USS / FORM FOUNDATION</h1>
      <p>Development reference. UI states only; no records are created.</p>
      <div className="uss-reference-row">
        <Button onClick={() => setError(!error)}>Toggle validation</Button>
        <Button variant="secondary" onClick={() => setBusy(!busy)}>
          Toggle loading
        </Button>
      </div>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError(true);
        }}
      >
        <FormSection
          title="ACCOUNT INFORMATION"
          description="Shared fields across auth, membership and CMS."
        >
          <div className="uss-form-grid">
            <Field
              label="Full name"
              hint="Use your real name for your USS Running membership profile."
              required
              error={
                error ? "Required field. Enter your full name." : undefined
              }
            >
              <Input name="fullName" required placeholder="Your name" />
            </Field>
            <Field
              label="Email address"
              hint="Use an active email. Account verification will be sent here."
              required
              error={error ? "Enter a valid email address." : undefined}
            >
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ardi@example.com"
              />
            </Field>
            <Field
              label="Password"
              hint="Use at least the configured minimum password length."
              required
              error={
                error ? "Password confirmation does not match." : undefined
              }
            >
              <PasswordInput name="password" autoComplete="new-password" />
            </Field>
            <Field
              label="Content type"
              hint="Choose how this Story is presented."
            >
              <Select defaultValue="community">
                <option value="community">Community</option>
                <option>
                  Media partnership with an intentionally long brand and
                  campaign title
                </option>
                <option disabled>Unavailable option</option>
              </Select>
            </Field>
            <Field
              label="Long helper and error"
              hint={"Main headline shown on the Story page and Story cards. ".repeat(
                8,
              )}
              error={
                error
                  ? "This intentionally long validation message explains what needs correction without clipping or moving the next field. ".repeat(
                      8,
                    )
                  : undefined
              }
            >
              <Input placeholder="Paste a long value" />
            </Field>
            <Field
              label="Excerpt"
              hint="Short summary shown on listing cards and social previews."
            >
              <Textarea
                className="resize-none"
                defaultValue="Community in motion."
              />
            </Field>
            <Field
              label="Disabled"
              hint="Unavailable while the operation is processing."
            >
              <Input disabled defaultValue="Not editable" />
            </Field>
            <Field
              label="Read only"
              hint="Server-issued identity cannot be edited."
            >
              <Input readOnly defaultValue="USS-DEMO-001" />
            </Field>
            <Field
              label="Confirmed value"
              success="Value confirmed."
              hint="Success feedback includes text."
            >
              <Input defaultValue="Confirmed" />
            </Field>
          </div>
          <Checkbox
            label="Privacy consent"
            hint="Review required policies before registering."
            required
            error={error ? "Please accept the required policy." : ""}
          />
          <Switch
            label="Featured Story"
            hint="Featured Stories may appear on the homepage."
          />
          <RadioGroup
            label="Story audience"
            name="audience"
            options={[
              { value: "community", label: "Community" },
              { value: "partners", label: "Partners" },
            ]}
            value={radio}
            onChange={setRadio}
            hint="Choose the editorial audience."
          />
        </FormSection>
        <FormActions
          cancel={
            <Button variant="secondary" onClick={() => setError(false)}>
              Cancel
            </Button>
          }
        >
          <Button type="submit" loading={busy} loadingLabel="Saving changes…">
            Save changes
          </Button>
        </FormActions>
      </form>
      <div className="uss-reference-row">
        {(
          ["primary", "secondary", "ghost", "danger", "icon", "text"] as const
        ).map((variant) => (
          <Button
            key={variant}
            onClick={() => notify(variant + " action preview.", "info")}
            variant={variant}
            aria-label={variant === "icon" ? "Open details" : undefined}
          >
            {variant === "icon" ? "↗" : variant}
          </Button>
        ))}
        <Button disabled>Disabled action</Button>
      </div>
      <div className="uss-reference-row">
        {(["success", "error", "warning", "info"] as const).map((tone) => (
          <Button
            key={tone}
            variant="secondary"
            onClick={() =>
              notify(
                tone === "error"
                  ? "We couldn't save your changes. Please try again."
                  : "Profile updated successfully.",
                tone,
              )
            }
          >
            {tone} toast
          </Button>
        ))}
      </div>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Archive Story dialog
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Archive this Story?"
        description={"The Story will no longer appear publicly, but its history will remain available. ".repeat(
          5,
        )}
        actions={
          <>
            <Button
              variant="secondary"
              autoFocus
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                notify("Demo Story archived.", "success");
              }}
            >
              Archive Story
            </Button>
          </>
        }
      />
      <div className="uss-reference-row">
        <Badge tone="success">Published</Badge>
        <Badge tone="warning">Scheduled</Badge>
        <Badge tone="error">Archived</Badge>
      </div>
      <PageLoading>
        <Skeleton height="3rem" />
        <Skeleton height="8rem" />
      </PageLoading>
      <EmptyState
        title="No stories yet."
        description="Create a Story to start sharing community voices."
        action={
          <Button
            onClick={() => notify("Create Story is a preview action.", "info")}
          >
            Create Story
          </Button>
        }
      />
    </main>
  );
}
export default function FormReference() {
  return (
    <ToastProvider>
      <Reference />
    </ToastProvider>
  );
}
