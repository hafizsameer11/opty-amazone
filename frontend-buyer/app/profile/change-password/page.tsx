"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/user-service";

type Step = "send" | "verify" | "reset";

function messageFrom(error: unknown, fallback: string) {
  const api = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
  return api?.errors ? Object.values(api.errors)[0]?.[0] || fallback : api?.message || fallback;
}

export default function ChangePasswordPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("send");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/auth/login?redirect=/profile/change-password");
  }, [authLoading, isAuthenticated, router]);

  const sendCode = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      await userService.sendPasswordChangeCode();
      setStep("verify");
      setSuccess("A verification code has been sent to your registered email.");
    } catch (value) { setError(messageFrom(value, "We could not send the verification code.")); }
    finally { setLoading(false); }
  };
  const verifyCode = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      await userService.verifyPasswordChangeCode(code.trim());
      setStep("reset");
      setSuccess("Email verified. Choose your new password.");
    } catch (value) { setError(messageFrom(value, "That verification code could not be confirmed.")); }
    finally { setLoading(false); }
  };
  const resetPassword = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      await userService.resetPasswordWithVerifiedCode(password, confirmation);
      setSuccess("Password updated successfully. Your new password is ready to use.");
      setPassword(""); setConfirmation("");
    } catch (value) { setError(messageFrom(value, "We could not update your password.")); }
    finally { setLoading(false); }
  };

  if (authLoading || !isAuthenticated) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#0066CC]" /></div>;

  return <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8"><Link href="/profile" className="mb-6 inline-flex items-center text-[#0066CC] hover:text-[#0052a3]">← Back to Profile</Link><section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"><p className="text-sm font-semibold text-teal-700">ACCOUNT SECURITY</p><h1 className="mt-1 text-3xl font-bold text-gray-900">Change Password</h1><p className="mt-2 text-sm leading-6 text-gray-600">We confirm this change with a one-time code sent only to your registered email address.</p>{error && <div className="mt-6"><Alert type="error" message={error} /></div>}{success && <div className="mt-6"><Alert type="success" message={success} /></div>}
    <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Registered email</p><p className="mt-1 break-all font-medium text-gray-900">{user?.email}</p></div>
    {step === "send" && <div className="mt-6"><Button onClick={() => void sendCode()} disabled={loading} className="w-full bg-[#0066CC] text-white hover:bg-[#0052a3]" size="lg">{loading ? "Sending code…" : "Send Code"}</Button></div>}
    {step === "verify" && <div className="mt-6 space-y-5"><Input label="Verification code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="Enter the 6-digit code" /><Button onClick={() => void verifyCode()} disabled={loading || code.length !== 6} className="w-full bg-[#0066CC] text-white hover:bg-[#0052a3]" size="lg">{loading ? "Verifying…" : "Verify Code"}</Button><button type="button" disabled={loading} onClick={() => void sendCode()} className="w-full text-sm font-semibold text-teal-700 hover:text-teal-800">Send a new code</button></div>}
    {step === "reset" && <div className="mt-6 space-y-5"><Input label="New Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><Input label="Confirm New Password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your new password" /><Button onClick={() => void resetPassword()} disabled={loading || password.length < 8 || password !== confirmation} className="w-full bg-[#0066CC] text-white hover:bg-[#0052a3]" size="lg">{loading ? "Saving…" : "Save New Password"}</Button></div>}
  </section></main>;
}
