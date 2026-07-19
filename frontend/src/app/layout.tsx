import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "sonner";

// Inter font is loaded via CSS @import in globals.css — no build-time network fetch needed.

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
