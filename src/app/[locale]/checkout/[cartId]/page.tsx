import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCartData } from "@/actions/getCartData";
import { AppHeader } from "@/components/modules/AppHeader";
import { CheckoutClient } from "@/components/modules/CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{ cartId: string; locale: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { cartId, locale } = await params;
  const t = await getTranslations("checkout");

  const data = await getCartData(cartId);

  if (!data || data.status === "abandoned" || data.status === "checked_out") {
    redirect(`/${locale}/upload`);
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader backHref="/dashboard" backLabel={t("backLabel")} />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <CheckoutClient data={data} />
      </Suspense>
    </div>
  );
}
