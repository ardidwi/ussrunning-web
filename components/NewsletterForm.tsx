"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { subscribeNewsletter } from "@/app/newsletter-actions";
import { Field, Input, Checkbox, Button } from "@/components/ui";
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; consent?: string }>(
    {},
  );
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const emailInput = useRef<HTMLInputElement>(null);
  return (
    <form
      className="uss-newsletter-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const next = {
          email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            ? "Enter a valid email address."
            : undefined,
          consent: !consent
            ? "Please review and accept newsletter consent."
            : undefined,
        };
        setErrors(next);
        if (next.email || next.consent) {
          emailInput.current?.focus();
          return;
        }
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await subscribeNewsletter(data);
            setFailed(false);
            setFeedback("You're subscribed to USS updates.");
          } catch {
            setFailed(true);
            setFeedback("We couldn't subscribe you. Please try again.");
          }
        });
      }}
    >
      <div className="uss-newsletter-row">
        <Field
          label="Email address"
          required
          hint="Use an active email for USS community updates."
          error={errors.email}
        >
          <Input
            ref={emailInput}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="your@email.com"
            required
            disabled={pending}
          />
        </Field>
        <Button type="submit" loading={pending} loadingLabel="Subscribing…">
          SUBSCRIBE
        </Button>
      </div>
      <Checkbox
        name="consent"
        required
        checked={consent}
        disabled={pending}
        onChange={(event) => setConsent(event.target.checked)}
        error={errors.consent ?? ""}
        label={
          <>
            I have read the <Link href="/privacy">Privacy Policy</Link> and
            consent to USS Running using my email to send community updates. I
            can unsubscribe at any time.
          </>
        }
      />
      <p className="uss-newsletter-feedback" role={failed ? "alert" : "status"}>
        {feedback}
      </p>
    </form>
  );
}
