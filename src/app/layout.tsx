import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/context/WalletContext";
import "./globals.css";
import "@fontsource/pretendard/400.css";
import "@fontsource/pretendard/500.css";
import "@fontsource/pretendard/600.css";
import "@fontsource/pretendard/700.css";

export const metadata: Metadata = {
  title: "MyDNA Insurance Agent",
  description:
    "Privacy-first genetic insurance powered by NEAR Protocol. Analyze your DNA in a TEE, prove eligibility with ZKP, pay with Confidential Intents.",
  keywords: ["genetic insurance", "NEAR Protocol", "TEE", "ZKP", "privacy", "blockchain"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WalletProvider>
          {children}
        </WalletProvider>
        <Toaster richColors position="top-right" expand visibleToasts={3} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
