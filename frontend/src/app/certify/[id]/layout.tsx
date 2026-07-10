import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verified Certificate · CoderCorps",
  description: "Verify an authentic CoderCorps engineering certificate — backed by real GitHub contributions and mentor code review.",
  openGraph: {
    title: "CoderCorps Verified Certificate",
    description: "This certificate represents a real software engineering project with verified code contributions, a live deployment, and a mentor-audited code review.",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "CoderCorps Certificate" }],
    siteName: "CoderCorps",
  },
  twitter: {
    card: "summary_large_image",
    title: "CoderCorps Verified Certificate",
    description: "Authentic engineering achievement verified by professional mentors.",
  },
};

export default function CertifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
