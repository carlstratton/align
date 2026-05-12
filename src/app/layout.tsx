import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Align.ai",
  description:
    "Align.ai uses contextual AI reasoning to surface the strongest candidates, helping small teams move beyond keyword screening and hire with greater clarity and conviction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans")}
    >
      <body className={cn(geistSans.className, "min-h-full flex flex-col bg-white text-slate-900")} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
