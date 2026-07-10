import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Philosophy & Mission | CoderCorps",
  description: "We do not sell certificates or make deceptive job guarantees. We enforce engineering standards through transparent reviews.",
  openGraph: {
    title: "Philosophy & Mission | CoderCorps",
    description: "We do not sell certificates or make deceptive job guarantees. We enforce engineering standards through transparent reviews.",
    url: "https://codercorps.com/about",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "About CoderCorps",
      },
    ],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
