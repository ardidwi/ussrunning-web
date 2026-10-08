"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "./Input";
export function PasswordInput({
  strength,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  strength?: { label: string; value: number };
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="uss-password">
      <div className="uss-password-control">
        <Input {...props} type={visible ? "text" : "password"} />
        <button
          className="uss-password-toggle"
          type="button"
          disabled={props.disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
      {strength && (
        <div className="uss-password-strength">
          <meter
            min={0}
            max={4}
            value={strength.value}
            aria-label={strength.label}
          />
          <span>{strength.label}</span>
        </div>
      )}
    </div>
  );
}
