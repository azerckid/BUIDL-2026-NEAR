import { redirect } from "next/navigation";
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

  return <CheckoutClient data={data} />;
}
