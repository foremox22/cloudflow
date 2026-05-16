import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/layout/ThemeProvider";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",          // lets content go behind the notch / home indicator
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f9" },
    { media: "(prefers-color-scheme: dark)",  color: "#030712" },
  ],
};

export const metadata: Metadata = {
  title: "Cloudflow",
  description: "Cloudflow Restaurant Management",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cloudflow",
    statusBarStyle: "black-translucent", // status bar blends into dark bg
  },
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      {/* Inline script runs before paint to avoid flash of wrong theme */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geist.className} min-h-full bg-gray-950`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
