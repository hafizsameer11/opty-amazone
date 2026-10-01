"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { userService } from "@/services/user-service";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

type Step = "send" | "verify" | "reset";

function errorMessage(error: unknown, fallback: string): string {
  const payload = (error as {
    response?: {
      data?: {
        errors?: Record<string, unknown>;
        message?: unknown;
      };
    };
  })?.response?.data;
  const validation = payload?.errors;
  if (validation) {
    const first = Object.values(validation).flatMap((value) => Array.isArray(value) ? value : [value]).find((value) => typeof value === "string");
    if (typeof first === "string") return first;
  }

  return typeof payload?.message === "string" ? payload.message : fallback;
}

/** Authenticated password changes require possession of the account email. */
export default function ChangePasswordForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("send");
  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const response = await userService.sendPasswordChangeCode();
      setEmail(response.email || user?.email || "");
      setStep("verify");
      setSuccess(t("passwordChange.codeSent"));
    } catch (cause) {
      setError(errorMessage(cause, t("passwordChange.sendFailed")));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError(t("passwordChange.invalidCode"));
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await userService.verifyPasswordChangeCode(code.trim());
      setStep("reset");
      setSuccess(t("passwordChange.codeVerified"));
    } catch (cause) {
      setError(errorMessage(cause, t("passwordChange.verifyFailed")));
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (password.length < 8 || password !== confirmation) {
      setError(t("passwordChange.passwordRules"));
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await userService.resetPasswordWithVerifiedCode(password, confirmation);
      setPassword("");
      setConfirmation("");
      setCode("");
      setStep("send");
      setSuccess(t("passwordChange.completed"));
    } catch (cause) {
      setError(errorMessage(cause, t("passwordChange.updateFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {step === "send" && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-gray-600">{t("passwordChange.sendCopy")}</p>
          <Input label={t("passwordChange.registeredEmail")} value={email} disabled readOnly />
          <Button type="button" onClick={sendCode} disabled={loading}>
            {loading ? t("passwordChange.sending") : t("passwordChange.sendCode")}
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-gray-600">{t("passwordChange.verifyCopy", { email })}</p>
          <Input
            label={t("passwordChange.code")}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            placeholder={t("passwordChange.codePlaceholder")}
          />
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={verifyCode} disabled={loading}>
              {loading ? t("passwordChange.verifying") : t("passwordChange.verifyCode")}
            </Button>
            <Button type="button" variant="outline" onClick={sendCode} disabled={loading}>
              {t("passwordChange.resendCode")}
            </Button>
          </div>
        </div>
      )}

      {step === "reset" && (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-gray-600">{t("passwordChange.resetCopy")}</p>
          <Input label={t("passwordChange.newPassword")} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input label={t("passwordChange.confirmPassword")} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          <Button type="button" onClick={updatePassword} disabled={loading}>
            {loading ? t("passwordChange.updating") : t("passwordChange.updatePassword")}
          </Button>
        </div>
      )}
    </div>
  );
}
