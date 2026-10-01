"use client";

import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import SectionBackLink from "@/components/ui/SectionBackLink";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ChangePasswordPage() {
  const { t } = useLanguage();

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-5">
      <SectionBackLink href="/profile" className="mb-2">
        {t("passwordChange.backToAccount")}
      </SectionBackLink>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t("passwordChange.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("passwordChange.subtitle")}</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}

