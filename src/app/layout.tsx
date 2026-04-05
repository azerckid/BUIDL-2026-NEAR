import type { Metadata } from "next";
import "./globals.css";

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
  return children;
}
