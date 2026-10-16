import type { APIRoute } from "astro";
import { getOpere } from "../lib/sanity";

const xml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const GET: APIRoute = async ({ site }) => {
  const opere = await getOpere();
  const home = new URL("/", site).href;
  const ultima = opere.map((o) => o.aggiornato).sort().at(-1);

  const voci = [
    `  <url>\n    <loc>${xml(home)}</loc>${ultima ? `\n    <lastmod>${xml(ultima)}</lastmod>` : ""}\n  </url>`,
    ...opere.map((o) => {
      const pagina = new URL(`/opere/${o.slug}/`, site).href;
      return [
        "  <url>",
        `    <loc>${xml(pagina)}</loc>`,
        `    <lastmod>${xml(o.aggiornato)}</lastmod>`,
        `    <image:image><image:loc>${xml(o.immagine.grande)}</image:loc></image:image>`,
        "  </url>",
      ].join("\n");
    }),
  ];

  const corpo = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...voci,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(corpo, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
