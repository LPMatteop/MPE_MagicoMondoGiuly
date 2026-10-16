import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const nonIndicizzare = import.meta.env.PUBLIC_NOINDEX === "true";
  // In modalità "non indicizzare" il sito resta crawlabile ma ogni pagina porta il meta noindex:
  // se robots.txt vietasse l'accesso, Google non vedrebbe mai quel meta.
  const righe = ["User-agent: *", "Allow: /"];
  if (!nonIndicizzare) righe.push("", `Sitemap: ${new URL("/sitemap.xml", site).href}`);
  return new Response(righe.join("\n") + "\n", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
