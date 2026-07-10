import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Engineering Academy Tracks | CoderCorps",
  description: "Learn PyTorch, Next.js, FastAPI, systems design, Go, Rust, and cloud native architecture. High depth curricula with real code output.",
  openGraph: {
    title: "Engineering Academy Tracks | CoderCorps",
    description: "Learn PyTorch, Next.js, FastAPI, systems design, Go, Rust, and cloud native architecture. High depth curricula with real code output.",
    url: "https://codercorps.com/academy",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "CoderCorps Academy",
      },
    ],
  },
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
