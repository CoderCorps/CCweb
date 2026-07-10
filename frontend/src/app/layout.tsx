import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoderCorps — Engineering Community & Verifiable Portfolios",
  description: "Accelerate your software engineering career. Build real projects, get code reviews from industry mentors, and earn verifiable certificates backed by code audits.",
  metadataBase: new URL("https://codercorps.com"),
  openGraph: {
    title: "CoderCorps — Engineering Community & Verifiable Portfolios",
    description: "Accelerate your software engineering career. Build real projects, get code reviews from industry mentors, and earn verifiable certificates backed by code audits.",
    url: "https://codercorps.com",
    siteName: "CoderCorps",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "CoderCorps Engineering Platform",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

