import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@fontsource/pretendard/400.css";
import "@fontsource/pretendard/500.css";
import "@fontsource/pretendard/600.css";
import "@fontsource/pretendard/700.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/context/WalletContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="ko" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WalletProvider>
          {children}
        </WalletProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
