import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCartData } from "@/actions/getCartData";
import { CheckoutClient } from "@/components/modules/CheckoutClient";

interface CheckoutPageProps {
  params: Promise<{ cartId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { cartId } = await params;

  const data = await getCartData(cartId);

  if (!data || data.status === "abandoned" || data.status === "checked_out") {
    redirect("/upload");
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutClient data={data} />
    </Suspense>
  );
}
