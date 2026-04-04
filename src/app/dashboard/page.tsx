import { redirect } from "next/navigation";
import { getDashboardData } from "@/actions/getDashboardData";
import { DashboardClient } from "@/components/modules/DashboardClient";

interface DashboardPageProps {
  searchParams: Promise<{ sid?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { sid } = await searchParams;

  if (!sid) redirect("/upload");

  const data = await getDashboardData(sid);

  if (!data) redirect("/upload");

  return <DashboardClient data={data} />;
}
