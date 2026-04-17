import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Farm Share Ledger",
  description: "Track shared farm expenses and balances",
};

// Co-locate all Serverless/Fluid Compute functions with the Supabase
// project (ap-southeast-1, Singapore). Without this, functions default to
// iad1 (US East) and each Supabase query pays ~230 ms cross-continent RTT.
export const preferredRegion = ["sin1"];

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#050506] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
