import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Labs Workspace Sprints | CoderCorps",
  description: "Connect to repositories, build features in sprints, collaborate with peers, and deploy to staging. Experience modern dev cycles.",
  openGraph: {
    title: "Labs Workspace Sprints | CoderCorps",
    description: "Connect to repositories, build features in sprints, collaborate with peers, and deploy to staging. Experience modern dev cycles.",
    url: "https://codercorps.com/labs",
    images: [
      {
        url: "/assets/logo-full.png",
        width: 1200,
        height: 630,
        alt: "CoderCorps Labs",
      },
    ],
  },
};

export default function LabsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
