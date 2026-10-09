"use client";
import AuthFlow from "@/components/auth/AuthFlow";
import type { AuthPolicy } from "@/lib/auth/contract";
export default function JoinForm({ policy }: { policy: AuthPolicy }) {
  return <AuthFlow flow="register" policy={policy} />;
}
