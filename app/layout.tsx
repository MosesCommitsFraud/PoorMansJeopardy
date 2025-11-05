import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import LayoutContent from "@/components/LayoutContent";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Poor Man's Jeopardy",
  description: "Interactive Jeopardy game with host and player views",
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

