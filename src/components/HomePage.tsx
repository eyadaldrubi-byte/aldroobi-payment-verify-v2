"use client";

/**
 * Customer-facing Aldroubi checker. Keep this page intentionally limited to
 * the receipt checker and supported bank list; developer/docs content is not
 * rendered for customers.
 */
import "./home/home.css";
import { banks } from "@/lib/banks";
import { VerifyPanel } from "@/components/verify/VerifyPanel";
import { AldroubiHeader } from "@/components/AldroubiHeader";
import { BankLogoByName } from "@/components/BankLogo";
import { useTranslation } from "@/lib/i18n/use-translation";

export function HomePage() {
  const { t } = useTranslation();
  const liveBanks = banks.filter((bank) => bank.status === "live");
  return (
    <div className="aldroubi-customer-page">
      <AldroubiHeader />
      <main className="aldroubi-main">
        <section className="aldroubi-intro">
          <h1>{t("hero.titleLead")}</h1>
          <p>{t("hero.subtitle")}</p>
        </section>
        <section id="verify" className="aldroubi-checker" aria-label="Receipt verification">
          <VerifyPanel />
        </section>
        <section className="aldroubi-banks" aria-label="Supported banks">
          <h2>{t("banks.title")}</h2>
          <div className="aldroubi-bank-grid">
            {liveBanks.map((bank) => (
              <div className="aldroubi-bank" key={bank.code}>
                <BankLogoByName code={bank.code} size={24} />
                <span>{bank.shortName}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <footer className="aldroubi-credit">إعداد وتطوير / EYADALDROUBI</footer>
    </div>
  );
}
