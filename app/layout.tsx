import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Dither from "@/components/Dither";

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
        {/* Fixed background with Dither effect */}
        <div className="fixed inset-0 -z-10">
          <Dither
            waveColor={[0.5, 0.5, 0.5]}
            disableAnimation={false}
            enableMouseInteraction={false}
            colorNum={6}
            waveAmplitude={0.3}
            waveFrequency={4}
            waveSpeed={0.03}
          />
        </div>
        {children}
      </body>
    </html>
  );
}

