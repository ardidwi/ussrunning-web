"use client";

import { type InputHTMLAttributes } from "react";
import { Checkbox } from "./Checkbox";
export function Switch(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label: string;
    hint?: string;
  },
) {
  return (
    <Checkbox
      {...props}
      role="switch"
      className={`uss-switch ${props.className ?? ""}`}
    />
  );
}
