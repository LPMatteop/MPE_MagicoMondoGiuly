import type { ImageMetadata } from "astro";
import dati from "./opere.json";

export interface Opera {
  slug: string;
  titolo: string;
  categoria: string;
  tecnica: string;
  larghezza?: string;
  altezza?: string;
  src: string; // URL remoto (Google Sites), usato finché non scarichi le immagini
  locale?: ImageMetadata; // immagine in src/assets/opere/<slug>.jpg, se presente
}

// Se lanci `npm run immagini`, le foto finiscono in src/assets/opere/
// e Astro le ottimizza in automatico (WebP/AVIF, varie larghezze).
const locali = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/opere/*.{jpg,jpeg,png,webp}",
  { eager: true },
);

function trovaLocale(slug: string) {
  const voce = Object.entries(locali).find(([p]) =>
    p.split("/").pop()!.replace(/\.\w+$/, "") === slug,
  );
  return voce?.[1].default;
}

export const opere: Opera[] = dati.opere.map((o) => ({
  ...o,
  locale: trovaLocale(o.slug),
}));

export const hero = { src: dati.hero.src, locale: trovaLocale("hero") };

export function misure(o: Opera) {
  return o.larghezza ? `${o.larghezza} × ${o.altezza} cm` : null;
}
