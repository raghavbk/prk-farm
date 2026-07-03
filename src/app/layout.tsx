import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { PwaInstallBanner } from "@/components/pwa-install-banner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["300", "400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "chukta — money divides, chukta settles",
  description: "Money divides. Chukta settles. Hisaab khatam, dosti kayam.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chukta",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F6E56",
};

// Runs before first paint to apply the user's saved theme and prevent FOUC.
const themeBootstrap = `
(function(){
  try {
    var saved = localStorage.getItem('farm-theme');
    var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var accent = localStorage.getItem('farm-accent');
    if (accent) document.documentElement.setAttribute('data-accent', accent);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <PwaRegister />
        {children}
        <PwaInstallBanner />
      </body>
    </html>
  );
}
