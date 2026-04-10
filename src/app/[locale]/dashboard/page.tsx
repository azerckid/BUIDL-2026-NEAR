import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/getDashboardData";
import { AppHeader } from "@/components/modules/AppHeader";
import { DashboardClient } from "@/components/modules/DashboardClient";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sid?: string; wallet?: string }>;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { locale } = await params;
  const { sid, wallet } = await searchParams;
  const t = await getTranslations("dashboard");

  if (!sid || !wallet) redirect(`/${locale}/upload`);

  const data = await getDashboardData(sid, decodeURIComponent(wallet));

  if (!data) redirect(`/${locale}/upload`);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader backHref="/upload" backLabel={t("backLabel")} />
      <DashboardClient data={data} />
    </div>
  );
}
