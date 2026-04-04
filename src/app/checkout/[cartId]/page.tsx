import { Badge } from "@/components/ui/badge";

interface CheckoutPageProps {
  params: Promise<{ cartId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { cartId } = await params;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs">
          Stage 6 — Confidential Intents 결제
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">결제 준비 완료</h1>
        <p className="text-sm text-muted-foreground">
          NEAR Confidential Intents + Chain Signatures 결제는 Stage 6에서 구현됩니다.
        </p>
        <p className="font-mono text-xs text-muted-foreground/60 break-all">
          cart: {cartId}
        </p>
      </div>
    </div>
  );
}
