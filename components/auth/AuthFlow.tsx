"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Field,
  FormSection,
  Input,
  PasswordInput,
  ToastProvider,
} from "@/components/ui";
import { authAdapter } from "@/lib/auth/client";
import type {
  AuthAdapter,
  AuthField,
  AuthFlow as Flow,
  AuthInput,
  AuthPolicy,
} from "@/lib/auth/contract";
import {
  maskEmail,
  passwordHint,
  validateAuth,
  emailError,
} from "@/lib/auth/validation";
import { safeReturnPath } from "@/lib/auth/return-path";
import { AuthStatus } from "./AuthStatus";
import ResendVerification from "./ResendVerification";
import { useAuthRequest } from "./useAuthRequest";
export type AuthFlowProps = {
  flow: Flow;
  policy: AuthPolicy;
  token?: string;
  returnTo?: string;
  sessionExpired?: boolean;
  verificationMode?: "link" | "code";
  adapter?: AuthAdapter;
  initialEmail?: string;
  onSignedIn?: (path: string) => void;
};
export default function AuthFlow(props: AuthFlowProps) {
  return (
    <ToastProvider>
      <FlowContent {...props} />
    </ToastProvider>
  );
}
function FlowContent({
  flow,
  policy,
  token,
  returnTo,
  sessionExpired,
  verificationMode = "link",
  adapter = authAdapter,
  initialEmail,
  onSignedIn,
}: AuthFlowProps) {
  const router = useRouter();
  const loginHref = returnTo
    ? "/login?returnTo=" + encodeURIComponent(safeReturnPath(returnTo))
    : "/login";
  const request = useAuthRequest(adapter);
  const [values, setValues] = useState<AuthInput>({
    email: initialEmail ?? "",
    fullName: "",
    password: "",
    confirmPassword: "",
    consent: false,
    code: "",
  });
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const result =
    request.state.phase === "settled" ? request.state.result : undefined;
  const pending = request.state.phase === "submitting";
  const heading = useRef<HTMLHeadingElement>(null);
  const verificationRequired =
    result?.state === "verification_required" ||
    (result?.state === "error" && result.code === "EMAIL_NOT_VERIFIED");
  useEffect(() => {
    if (verificationRequired) heading.current?.focus();
    if (result?.state === "signed_in") {
      const path = safeReturnPath(result.returnTo ?? returnTo);
      if (onSignedIn) onSignedIn(path);
      else {
        router.replace(path);
        router.refresh();
      }
    }
  }, [result, verificationRequired, router, returnTo, onSignedIn]);
  const update = (field: AuthField, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const validate = () => {
    const next = validateAuth(flow, values, policy);
    if (flow === "verify" && verificationMode === "code") {
      const issue = emailError(values.email);
      if (issue) next.email = issue;
      if (!values.code?.trim())
        next.code = "Enter the verification code from your email.";
    }
    return next;
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || result?.state === "signed_in") return;
    const form = event.currentTarget;
    const next = validate();
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      (event.currentTarget.elements.namedItem(first) as HTMLElement)?.focus();
      return;
    }
    const response = await request.submit(flow, {
      ...values,
      email: values.email?.trim(),
      fullName: values.fullName?.trim(),
      token,
      returnTo: safeReturnPath(returnTo),
    });
    if (response?.state === "error" && response.code === "ACCOUNT_CONFLICT") {
      setErrors({ email: "This email is already registered." });
      (form.elements.namedItem("email") as HTMLElement)?.focus();
    }
    if (
      response?.state === "verification_required" ||
      response?.state === "verified" ||
      response?.state === "already_verified" ||
      response?.state === "password_reset"
    ) {
      // Remove consumed bearer material from the address bar; never persist it.
      if (response.state !== "verification_required")
        window.history.replaceState(null, "", "/login?flow=" + flow);
      setValues((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
        code: "",
      }));
    }
  };
  const emailField = (
    <Field
      label="Email address"
      required
      hint={
        flow === "register"
          ? "Use an active email. Account verification will be sent here."
          : flow === "forgot"
            ? "Enter the email you use for your USS account."
            : "Use the email associated with your USS account."
      }
      error={errors.email}
    >
      <Input
        name="email"
        type="email"
        autoComplete={flow === "login" ? "username" : "email"}
        placeholder="you@example.com"
        value={values.email}
        onChange={(event) => update("email", event.target.value)}
        onBlur={() => {
          const e = validate();
          setErrors((current) => ({ ...current, email: e.email }));
        }}
        disabled={pending}
        required
      />
    </Field>
  );
  if (
    result?.state === "verification_required" &&
    result.verificationMode === "code"
  )
    return (
      <AuthFlow
        flow="verify"
        verificationMode="code"
        policy={policy}
        adapter={adapter}
        initialEmail={result.email ?? values.email}
      />
    );
  if (verificationRequired)
    return (
      <div className="uss-auth-flow">
        <div className="uss-auth-status">
          <h3 ref={heading} tabIndex={-1}>
            VERIFY YOUR EMAIL.
          </h3>
          <p>
            Your email needs to be verified before your USS account becomes
            active.
          </p>
          <p>
            Check for verification instructions at{" "}
            {maskEmail(
              result?.state === "verification_required"
                ? (result.email ?? values.email)
                : values.email,
            )}
            .
          </p>
          <Link href="/login?flow=verify">Open email verification ↗</Link>
        </div>
        <ResendVerification
          email={
            result?.state === "verification_required"
              ? (result.email ?? values.email)
              : values.email
          }
          adapter={adapter}
          policy={policy}
          initialRetryAfterSeconds={
            result && "retryAfterSeconds" in result
              ? result.retryAfterSeconds
              : undefined
          }
        />
        <Link href={loginHref}>Back to sign in ↗</Link>
      </div>
    );
  if (
    result &&
    [
      "verified",
      "already_verified",
      "password_reset",
      "recovery_sent",
    ].includes(result.state)
  )
    return (
      <div className="uss-auth-flow">
        <AuthStatus loginHref={loginHref} result={result} />
        {result.state === "recovery_sent" && (
          <Button variant="text" onClick={request.clear}>
            Try another email
          </Button>
        )}
      </div>
    );
  if (flow === "reset" && !token)
    return (
      <div className="uss-auth-flow">
        <AuthStatus
          loginHref={loginHref}
          result={{ state: "error", code: "RESET_INVALID" }}
        />
        <Link href="/login?flow=forgot">Request a password reset link ↗</Link>
      </div>
    );
  if (
    flow === "reset" &&
    result?.state === "error" &&
    ["RESET_INVALID", "RESET_EXPIRED"].includes(result.code)
  )
    return (
      <div className="uss-auth-flow">
        <AuthStatus loginHref={loginHref} result={result} />
        <Link href="/login?flow=forgot">Request a new reset link ↗</Link>
        <Link href={loginHref}>Back to sign in ↗</Link>
      </div>
    );
  const labels = {
    login: ["Log in ↗", "Signing in…"],
    register: ["Create account ↗", "Creating account…"],
    forgot: ["Send reset instructions ↗", "Sending reset instructions…"],
    reset: ["Reset password ↗", "Resetting password…"],
    verify: ["Verify email ↗", "Verifying email…"],
  };
  return (
    <div className="uss-auth-flow">
      {sessionExpired && flow === "login" && (
        <div className="uss-auth-session" role="status">
          <strong>Your session has expired.</strong>
          <p>Sign in again to continue.</p>
        </div>
      )}
      {flow === "verify" && initialEmail && (
        <div className="uss-auth-status">
          <h3>VERIFY YOUR EMAIL.</h3>
          <p>Enter the verification code sent to {maskEmail(initialEmail)}.</p>
        </div>
      )}
      <form
        className="uss-auth-form"
        method="post"
        noValidate
        onSubmit={submit}
        aria-busy={pending}
      >
        {flow === "register" && (
          <FormSection
            title="Account information"
            description="Your identity for the USS Running community."
          >
            <Field
              label="Full name"
              hint="Use your real name for your USS Running membership profile."
              required
              error={errors.fullName}
            >
              <Input
                name="fullName"
                autoComplete="name"
                placeholder="Ardi Pratama"
                value={values.fullName}
                onChange={(event) => update("fullName", event.target.value)}
                disabled={pending}
                required
              />
            </Field>
            {emailField}
          </FormSection>
        )}
        {(flow === "login" ||
          flow === "forgot" ||
          (flow === "verify" && verificationMode === "code")) &&
          emailField}
        {flow === "verify" && verificationMode === "code" && (
          <Field
            label="Verification code"
            required
            hint="Enter the one-time code from your verification email."
            error={errors.code}
          >
            <Input
              name="code"
              autoComplete="one-time-code"
              value={values.code}
              placeholder="Your verification code"
              onChange={(event) => update("code", event.target.value)}
              disabled={pending}
              required
            />
          </Field>
        )}
        {flow === "verify" && verificationMode === "link" && (
          <p>
            {token
              ? "Confirm your email using this verification link. Its validity will be checked securely."
              : "Open the verification link from your email to continue. You can request another email below."}
          </p>
        )}
        {(["login", "register", "reset"] as Flow[]).includes(flow) && (
          <AuthPasswordSection login={flow === "login"}>
            <Field
              label={flow === "reset" ? "New password" : "Password"}
              required
              hint={
                flow === "login"
                  ? "Enter your account password. Use the eye button to check it."
                  : passwordHint(policy)
              }
              error={errors.password}
            >
              <PasswordInput
                name="password"
                autoComplete={
                  flow === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  flow === "reset"
                    ? "Choose a new password"
                    : "Enter your password"
                }
                value={values.password}
                onChange={(event) => {
                  update("password", event.target.value);
                  if (values.confirmPassword)
                    setErrors((current) => ({
                      ...current,
                      confirmPassword:
                        event.target.value === values.confirmPassword
                          ? undefined
                          : "Passwords do not match.",
                    }));
                }}
                onBlur={() => {
                  const e = validate();
                  setErrors((current) => ({
                    ...current,
                    password: e.password,
                  }));
                }}
                disabled={pending}
                required
              />
            </Field>
            {flow !== "login" && (
              <Field
                label={
                  flow === "reset" ? "Confirm new password" : "Confirm password"
                }
                required
                hint="Enter the same password again."
                error={errors.confirmPassword}
                success={
                  values.confirmPassword &&
                  values.confirmPassword === values.password
                    ? "Passwords match."
                    : undefined
                }
              >
                <PasswordInput
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={values.confirmPassword}
                  onChange={(event) => {
                    update("confirmPassword", event.target.value);
                    if (
                      event.target.value &&
                      event.target.value !== values.password
                    )
                      setErrors((current) => ({
                        ...current,
                        confirmPassword: "Passwords do not match.",
                      }));
                  }}
                  disabled={pending}
                  required
                />
              </Field>
            )}
          </AuthPasswordSection>
        )}
        {flow === "register" && (
          <FormSection
            title="Consent"
            description="Review the policies before creating your USS account."
          >
            <Checkbox
              name="consent"
              required
              checked={values.consent}
              onChange={(event) => update("consent", event.target.checked)}
              disabled={pending}
              error={errors.consent}
              label={
                <>
                  I accept the{" "}
                  <Link
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer">
                    Terms of Use
                  </Link>
                  .
                </>
              }
              hint="Required to create an account. Opens in a new tab so your form stays here."
            />
          </FormSection>
        )}
        <div className="uss-auth-feedback" aria-live="polite">
          {pending ? (
            <p>{labels[flow][1]}</p>
          ) : result && result.state !== "signed_in" ? (
            <AuthStatus loginHref={loginHref} result={result} />
          ) : Object.values(errors).some(Boolean) ? (
            <p role="alert">Please review the highlighted fields.</p>
          ) : null}
        </div>
        {flow === "login" && (
          <Link
            href={
              "/login?flow=forgot&returnTo=" +
              encodeURIComponent(safeReturnPath(returnTo))
            }
          >
            Forgot your password? ↗
          </Link>
        )}
        <Button
          type="submit"
          loading={pending}
          loadingLabel={labels[flow][1]}
          disabled={
            result?.state === "signed_in" ||
            (flow === "verify" && verificationMode === "link" && !token)
          }
        >
          {labels[flow][0]}
        </Button>
      </form>
      {flow === "verify" && (
        <ResendVerification
          email={initialEmail}
          adapter={adapter}
          policy={policy}
        />
      )}
      {flow !== "login" && <Link href={loginHref}>Back to sign in ↗</Link>}
      {flow === "login" && (
        <Link href="/join">New to USS? Create an account ↗</Link>
      )}
    </div>
  );
}

function AuthPasswordSection({
  login,
  children,
}: {
  login: boolean;
  children: ReactNode;
}) {
  return login ? (
    <>{children}</>
  ) : (
    <FormSection
      title="Your password"
      description="Keep your USS account secure."
    >
      {children}
    </FormSection>
  );
}
