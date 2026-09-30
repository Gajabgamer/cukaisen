import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionPrefsProvider } from "@/lib/motionPrefs";
import "./globals.css";
import CursedThemeInit from "@/components/shared/CursedThemeInit";
import VeilLoader from "@/components/veil/VeilLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0b0614"
};

export const metadata: Metadata = {
  title: { default: "CUKAISEN · Cursed Campus Navigator", template: "%s · CUKAISEN" },
  description: "CUKAISEN: a Jujutsu Kaisen themed campus navigator for Chandigarh University. Pick a sorcerer guide, search 300+ real places and get led there.",
  keywords: [
    "campus", "navigation", "map", "university", "college", "places", "directions",
    "cukaisen", "cu map", "cu navigation", "chandigrah map", "chandigarh map",
    "cu campus map", "cu campus navigation", "chandigarh university map"
  ],
  applicationName: "CUKAISEN",
  authors: [{ name: "CUKAISEN Team" }],
  metadataBase: new URL("https://cukaisen.vercel.app"),
  openGraph: { title: "CUKAISEN · Cursed Campus Navigator", description: "Pick a sorcerer. Find any place at Chandigarh University.", url: "https://cukaisen.vercel.app", siteName: "CUKAISEN", images: ["/logo.png"] },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: '/logo.svg', type: 'image/svg+xml' }, { url: '/logo.png', type: 'image/png' }],
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CUKAISEN"
  },
  verification: {
    google: "GPcAMvoJqIiDxD5OD-H1As13QpgXIFrcuy0sChrji6Y"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPWAInstallPrompt = e;
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch((err) => {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MotionPrefsProvider>
          <CursedThemeInit />
          <VeilLoader />
          {children}
        </MotionPrefsProvider>
      </body>
    </html>
  );
}
