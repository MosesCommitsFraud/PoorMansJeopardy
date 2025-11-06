import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poor Man's Jeopardy",
  description: "Just a Jeopardy game, but for free.",
  icons: {
    icon: '/PMJLogoSmall.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SettingsProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </SettingsProvider>
      </body>
    </html>
  );
}

