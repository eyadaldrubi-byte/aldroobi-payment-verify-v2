"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeControl } from "@/components/theme-control";

export function AldroubiHeader() {
  return (
    <header className="aldroubi-header">
      <strong className="aldroubi-brand"><a href="#verify" className="aldroubi-verify-link">{isArabic ? "التحقق" : "Verify"}</a> · {isArabic ? "الدروبي" : "Aldroubi"}</strong>
      <nav className="aldroubi-controls" aria-label="Settings">
        <LanguageSwitcher variant="compact" />
        <ThemeControl variant="compact" />
      </nav>
    </header>
  );
}
