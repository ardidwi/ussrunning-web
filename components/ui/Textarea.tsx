"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useImperativeHandle,
  type TextareaHTMLAttributes,
} from "react";
import { useFieldControl } from "./Field";
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(
  { id, className = "", "aria-describedby": describedBy, onChange, ...props },
  ref,
) {
  const field = useFieldControl(id, describedBy);
  const element = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => element.current!);
  function grow() {
    if (element.current) {
      element.current.style.height = "auto";
      element.current.style.height = element.current.scrollHeight + "px";
    }
  }
  useLayoutEffect(grow, [props.value, props.defaultValue]);
  return (
    <textarea
      {...field}
      {...props}
      ref={element}
      rows={props.rows ?? 5}
      className={`uss-control uss-textarea resize-none ${className}`}
      onChange={(event) => {
        grow();
        onChange?.(event);
      }}
    />
  );
});
