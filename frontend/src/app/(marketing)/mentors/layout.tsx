import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Core Board of Engineering Mentors | CoderCorps",
  description: "Get line-by-line code reviews from staff engineers, distributed system architects, and technical training experts.",
  openGraph: {
    title: "Core Board of Engineering Mentors | CoderCorps",
    description: "Get line-by-line code reviews from staff engineers, distributed system architects, and technical training experts.",
    url: "https://codercorps.com/mentors",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "CoderCorps Mentors",
      },
    ],
  },
};

export default function MentorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
