import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/getDashboardData";
import { AppHeader } from "@/components/modules/AppHeader";
import { DashboardClient } from "@/components/modules/DashboardClient";

interface DashboardPageProps {
  searchParams: Promise<{ sid?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { sid } = await searchParams;

  if (!sid) redirect("/upload");

  const data = await getDashboardData(sid);

  if (!data) redirect("/upload");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader backHref="/upload" backLabel="업로드로" />
      <DashboardClient data={data} />
    </div>
  );
}
