"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { getAssetUrl } from "@/lib/utils";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "CoderCorps",
            "url": "https://codercorps.com",
            "logo": "https://codercorps.com/assets/logo-full.png",
            "sameAs": [
              "https://github.com/CoderCorps",
              "https://linkedin.com/company/codercorps"
            ]
          })
        }}
      />
      {/* Header */}
      <header className="fixed top-0 w-full z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={38} height={38} className="object-contain" style={{ height: "auto" }} unoptimized priority />
              <span className="font-bold text-xl tracking-tight text-foreground">Coder<span className="text-primary">Corps</span></span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/academy" className="hover:text-foreground transition-colors">Academy</Link>
              <Link href="/labs" className="hover:text-foreground transition-colors">Labs Workspace</Link>
              <Link href="/mentors" className="hover:text-foreground transition-colors">Mentors</Link>
              <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {!loading && user ? (
              <Link href="/dashboard">
                <Button className="font-semibold shadow-md">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <Link href="/signup">
                  <Button className="font-semibold">Join Community</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 border-b border-border p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-3 font-medium text-muted-foreground">
              <Link href="/academy" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Academy</Link>
              <Link href="/labs" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Labs Workspace</Link>
              <Link href="/mentors" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Mentors</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">About</Link>
              <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="hover:text-white">Contact</Link>
            </nav>
            <div className="h-px bg-border my-2" />
            <div className="flex flex-col gap-2">
              {!loading && user ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Join Community</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src={getAssetUrl("/assets/logo.gif")} alt="CoderCorps" width={32} height={32} className="object-contain" style={{ height: "auto" }} unoptimized />
            <span className="font-bold text-lg text-foreground">Coder<span className="text-primary">Corps</span></span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link href="/academy" className="hover:text-foreground">Academy</Link>
            <Link href="/labs" className="hover:text-foreground">Labs</Link>
            <Link href="/about" className="hover:text-foreground">Philosophy</Link>
            <Link href="/contact" className="hover:text-foreground">Support</Link>
          </div>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            &copy; {new Date().getFullYear()} CoderCorps. Built for builders. No placement guarantees, no shortcuts. Just verified, auditable engineering capabilities.
          </p>
        </div>
      </footer>
    </div>
  );
}
