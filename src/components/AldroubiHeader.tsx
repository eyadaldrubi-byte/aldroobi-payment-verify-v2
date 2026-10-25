"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeControl } from "@/components/theme-control";

export function AldroubiHeader() {
  return (
    <header className="aldroubi-header">
      <strong className="aldroubi-brand">Aldroubi</strong>
      <nav className="aldroubi-controls" aria-label="Settings">
        <LanguageSwitcher variant="compact" />
        <ThemeControl variant="compact" />
      </nav>
    </header>
  );
}
