import { MetadataRoute } from "next";

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://codercorps.com";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Static routes
  const routes = [
    "",
    "/academy",
    "/labs",
    "/mentors",
    "/about",
    "/contact",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic portfolio routes
  try {
    const res = await fetch(`${apiUrl}/portfolio`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const usernames: string[] = await res.json();
      const portfolioRoutes = usernames.map((username: string) => ({
        url: `${baseUrl}/portfolio/${username}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
      return [...routes, ...portfolioRoutes];
    }
  } catch (err) {
    console.error("Sitemap fetch failed: fallback to static routes.", err);
  }

  return routes;
}
