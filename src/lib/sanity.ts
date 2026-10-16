// L'UNICO file che parla con Sanity. Tutto il resto del sito riceve oggetti semplici
// (testi, numeri, URL), così cambiando grafica questo file non si tocca.
import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import { toHTML } from "@portabletext/to-html";

const client = createClient({
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET,
  apiVersion: "2025-01-01",
  useCdn: false, // il sito si genera in fase di build: meglio i dati più freschi
  perspective: "published", // solo i contenuti pubblicati, mai le bozze
});
const builder = createImageUrlBuilder(client);

// ---------- Tipi usati dal sito ----------

export interface Immagine {
  src: string;
  srcset: string;
  grande: string; // per lightbox e pagina di dettaglio
  larghezza: number;
  altezza: number;
  segnaposto?: string; // anteprima sfocata minuscola (LQIP) mentre carica
  alt: string;
}

export interface Tema {
  slug: string;
  nome: string;
}

export interface Opera {
  slug: string;
  titolo: string;
  aggiornato: string; // data ISO dell'ultima modifica, per la sitemap
  larghezza: number | null;
  altezza: number | null;
  titoloSeo: string | null; // titolo per Google, se Giuliana l'ha scritto
  descrizioneSeo: string | null; // descrizione per Google, se scritta
  descrizioneTesto: string | null; // la descrizione lunga in testo semplice
  tema: Tema | null;
  tecnica: string | null;
  misure: string | null; // "50 × 70 cm"
  anno: number | null;
  descrizioneHtml: string | null;
  prezzo: number | null;
  venduto: boolean;
  linkPagamento: string | null;
  acquistabile: boolean;
  immagine: Immagine;
}

export interface Impostazioni {
  nomeArtista: string | null;
  descrizioneSito: string | null;
  fotoApertura: Immagine | null;
  fraseApertura: string | null;
  chiSonoTitolo: string | null;
  chiSonoHtml: string | null;
  email: string | null;
  instagram: string | null;
}

// ---------- Conversioni ----------

const TECNICHE: Record<string, string> = {
  olio: "Olio",
  "olio-tela": "Olio su tela",
  "olio-tavola": "Olio su tavola",
  "olio-legno-mare": "Olio su legno recuperato dal mare",
};

const LARGHEZZE = [400, 700, 1000, 1400];

function immagine(img: any, alt: string): Immagine {
  const dim = img.asset.metadata.dimensions;
  const url = (w: number) => builder.image(img).width(Math.min(w, dim.width)).auto("format").quality(80).url();
  return {
    src: url(700),
    srcset: LARGHEZZE.filter((w) => w <= dim.width).map((w) => `${url(w)} ${w}w`).join(", ") || `${url(dim.width)} ${dim.width}w`,
    grande: url(2200),
    larghezza: dim.width,
    altezza: dim.height,
    segnaposto: img.asset.metadata.lqip,
    alt,
  };
}

const formattaNumero = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });
const html = (blocchi: any[] | null) => (blocchi?.length ? toHTML(blocchi) : null);

const testoSemplice = (blocchi: any[] | null) =>
  blocchi?.length
    ? blocchi
        .map((b) => (b.children ?? []).map((c: any) => c.text ?? "").join(""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim() || null
    : null;

// Accorcia un testo a ~155 caratteri (la misura che Google mostra), senza spezzare le parole
export function riassunto(testo: string | null | undefined, max = 155): string | null {
  const t = testo?.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const taglio = t.slice(0, max - 1);
  return taglio.slice(0, Math.max(taglio.lastIndexOf(" "), 60)).replace(/[,;:.\s]+$/, "") + "…";
}

// ---------- Query ----------

const CAMPI_IMMAGINE = `{ ..., asset->{ _id, metadata { lqip, dimensions { width, height } } } }`;

const QUERY_OPERE = `*[_type == "opera" && defined(slug.current) && defined(immagine.asset)]
  | order(coalesce(ordine, 999999) asc, titolo asc) {
    _updatedAt, titolo, "slug": slug.current, tecnica, larghezza, altezza, anno, descrizione,
    titoloSeo, descrizioneSeo,
    prezzo, venduto, linkPagamento,
    "tema": tema->{ nome, "slug": slug.current },
    immagine ${CAMPI_IMMAGINE}
  }`;

const QUERY_TEMI = `*[_type == "tema" && defined(slug.current)]
  | order(coalesce(ordine, 999999) asc, nome asc) { nome, "slug": slug.current }`;

const QUERY_IMPOSTAZIONI = `*[_id == "impostazioni"][0] {
  nomeArtista, descrizioneSito, fraseApertura, chiSonoTitolo, chiSonoTesto, email, instagram,
  fotoApertura ${CAMPI_IMMAGINE}
}`;

let cacheOpere: Promise<Opera[]> | undefined;

export function getOpere(): Promise<Opera[]> {
  // Durante la build più pagine chiedono le opere: le scarico una volta sola
  cacheOpere ??= client.fetch<any[]>(QUERY_OPERE).then((righe) =>
    righe.map((o) => {
      const prezzo = typeof o.prezzo === "number" ? o.prezzo : null;
      const venduto = Boolean(o.venduto);
      return {
        slug: o.slug,
        titolo: o.titolo,
        aggiornato: o._updatedAt,
        larghezza: o.larghezza ?? null,
        altezza: o.altezza ?? null,
        titoloSeo: o.titoloSeo?.trim() || null,
        descrizioneSeo: o.descrizioneSeo?.trim() || null,
        descrizioneTesto: testoSemplice(o.descrizione),
        tema: o.tema?.slug ? o.tema : null,
        tecnica: o.tecnica ? (TECNICHE[o.tecnica] ?? o.tecnica) : null,
        misure: o.larghezza && o.altezza ? `${formattaNumero(o.larghezza)} × ${formattaNumero(o.altezza)} cm` : null,
        anno: o.anno ?? null,
        descrizioneHtml: html(o.descrizione),
        prezzo,
        venduto,
        linkPagamento: o.linkPagamento ?? null,
        acquistabile: !venduto && prezzo !== null && Boolean(o.linkPagamento),
        // Il testo alternativo scritto da Giuliana, altrimenti il titolo
        immagine: immagine(o.immagine, o.immagine.alt?.trim() || o.titolo),
      };
    }),
  );
  return cacheOpere;
}

export async function getTemi(): Promise<Tema[]> {
  return client.fetch<Tema[]>(QUERY_TEMI);
}

export async function getImpostazioni(): Promise<Impostazioni> {
  const i = (await client.fetch<any>(QUERY_IMPOSTAZIONI)) ?? {};
  return {
    nomeArtista: i.nomeArtista?.trim() || null,
    descrizioneSito: i.descrizioneSito?.trim() || null,
    fotoApertura: i.fotoApertura?.asset ? immagine(i.fotoApertura, i.fotoApertura.alt ?? "") : null,
    fraseApertura: i.fraseApertura ?? null,
    chiSonoTitolo: i.chiSonoTitolo ?? null,
    chiSonoHtml: html(i.chiSonoTesto),
    email: i.email ?? null,
    instagram: i.instagram ?? null,
  };
}

export const formattaPrezzo = (euro: number) =>
  euro.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
