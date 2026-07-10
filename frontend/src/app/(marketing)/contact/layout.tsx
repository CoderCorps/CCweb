import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get in Touch with CoderCorps",
  description: "Have questions about the academy tracks, labs workspace, or credential auditing? Send us an inquiry.",
  openGraph: {
    title: "Get in Touch with CoderCorps",
    description: "Have questions about the academy tracks, labs workspace, or credential auditing? Send us an inquiry.",
    url: "https://codercorps.com/contact",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "Contact CoderCorps",
      },
    ],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
