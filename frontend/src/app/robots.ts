import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://codercorps.com";
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/academy", "/contact", "/labs", "/mentors", "/portfolio/*"],
      disallow: ["/dashboard", "/settings", "/projects", "/mentor/*", "/portfolio"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
