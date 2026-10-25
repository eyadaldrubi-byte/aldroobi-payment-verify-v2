import { VerifyPanel } from "@/components/verify/VerifyPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الدروبي للصرافة والتحويلات المالية | تحقق من المدفوعات",
  description:
    "تحقق من إيصالات التحويلات والمدفوعات البنكية. لا تُعتبر قراءة رمز QR أو استخراج بيانات الإيصال تأكيدًا للدفع ما لم تؤكد الجهة البنكية العملية.",
  robots: { index: false, follow: false },
};

export default function AldroobiPage() {
  return (
    <main dir="rtl" lang="ar" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xl font-bold tracking-tight">الدروبي</p>
            <p className="mt-1 text-sm text-muted-foreground">للصرافة والتحويلات المالية</p>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium">
            تحقق من المدفوعات
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold text-muted-foreground">
            خدمة مخصصة لموظفي الصرافة والتحويلات
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            تحقق من الإيصال قبل اعتماد الدفع
          </h1>
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            أدخل رقم العملية أو رابط الإيصال، ثم راجع نتيجة التحقق. لا تعتمد الدفع
            اعتمادًا على صورة الإيصال أو رمز QR وحدهما.
          </p>
        </div>

        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-6">
          <VerifyPanel />
        </div>

        <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">
          <p className="font-semibold">تنبيه مهم</p>
          <p className="mt-1 text-muted-foreground">
            تُعد العملية مؤكدة فقط عندما تظهر نتيجة تحقق صريحة من سجل البنك أو مزود
            الدفع. قراءة بيانات QR أو استخراج معلومات من الصورة لا تعني أن الأموال
            وصلت إلى الحساب.
          </p>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center text-xs text-muted-foreground">
          الدروبي للصرافة والتحويلات المالية
        </div>
      </footer>
    </main>
  );
}
