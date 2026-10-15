// Scarica le immagini dal vecchio sito Google in src/assets/opere/
// Uso: npm run immagini
//
// Gli URL delle immagini di Google Sites scadono dopo un po', quindi lo script
// rilegge la pagina per avere link aggiornati e li abbina alle opere nell'ordine
// in cui compaiono (prima la foto di apertura, poi i quadri come in opere.json).
import { readFile, writeFile, access, mkdir } from "node:fs/promises";

const PAGINA = "https://sites.google.com/view/il-magico-mondo-di-giuly/home-page";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
  Referer: "https://sites.google.com/",
  Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
};

const dati = JSON.parse(await readFile(new URL("../src/data/opere.json", import.meta.url)));
const cartella = new URL("../src/assets/opere/", import.meta.url);
await mkdir(cartella, { recursive: true });
const lista = [{ slug: "hero" }, ...dati.opere];

// 1. Leggo la pagina e raccolgo gli URL delle immagini, nell'ordine, senza doppioni
const html = await (await fetch(PAGINA, { headers: HEADERS })).text();
const trovati = html.match(
  /https:\/\/(?:lh\d+\.googleusercontent\.com\/sitesv|sites\.google\.com\/sitesv-images-rt)\/[^"'\s)\\]+/g,
) ?? [];
// La stessa immagine può comparire con due host diversi (es. nell'anteprima og:image
// e nel corpo pagina): i doppioni si riconoscono dall'ID, cioè l'ultima parte del percorso.
const urls = [
  ...new Map(
    trovati.map((u) => {
      const base = u.replace(/=[^=/]*$/, "");
      return [base.split("/").pop(), base];
    }),
  ).values(),
];

// Con --salta 0,5 escludo le immagini con quei numeri (vedi cartella immagini-grezze)
const iSalta = process.argv.indexOf("--salta");
if (iSalta > -1) {
  const salta = new Set(process.argv[iSalta + 1].split(",").map(Number));
  for (const n of [...salta].sort((a, b) => b - a)) urls.splice(n, 1);
}

if (urls.length !== lista.length) {
  // Scarico tutto numerato, così si vede a colpo d'occhio quale immagine è di troppo
  const grezze = new URL("../immagini-grezze/", import.meta.url);
  await mkdir(grezze, { recursive: true });
  console.log(`Trovate ${urls.length} immagini, ma le opere sono ${lista.length}. Le scarico numerate per controllarle...`);
  for (const [i, u] of urls.entries()) {
    const nome = String(i).padStart(2, "0");
    try { await writeFile(new URL(`${nome}.jpg`, grezze), await scarica(u)); }
    catch (e) { console.error(`ERRORE ${nome} (${e.message})`); }
  }
  console.error(
    "\nApri la cartella immagini-grezze, trova il numero dell'immagine che non è un quadro\n" +
      "(o il doppione della foto di apertura) e rilancia, per esempio:\n" +
      "  npm run immagini -- --salta 1",
  );
  process.exit(1);
}

// 2. Scarico ogni immagine, prima in grande e poi, se non va, alla misura standard
async function scarica(base) {
  for (const misura of ["=w2400", "=w1280", ""]) {
    const r = await fetch(base + misura, { headers: HEADERS });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (misura === "") throw new Error(`HTTP ${r.status}`);
  }
}

let errori = 0;
for (const [i, { slug }] of lista.entries()) {
  const file = new URL(`${slug}.jpg`, cartella);
  try { await access(file); console.log(`già presente  ${slug}`); continue; } catch {}
  try {
    await writeFile(file, await scarica(urls[i]));
    console.log(`scaricata     ${slug}`);
  } catch (e) {
    errori++;
    console.error(`ERRORE        ${slug}  (${e.message})`);
  }
}
console.log(errori ? `\nFinito con ${errori} errori.` : "\nTutte le immagini scaricate.");
