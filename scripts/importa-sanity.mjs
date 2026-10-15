// Importa in Sanity temi, impostazioni del sito e opere.
// Le opere vengono da src/data/opere.json, le foto da src/assets/opere/
// Uso: npm run importa
// Si può rilanciare senza creare doppioni: i documenti hanno ID fissi e Sanity
// riconosce le immagini già caricate. ATTENZIONE: rilanciandolo, le modifiche fatte
// nello Studio ai documenti importati vengono sovrascritte.
import { readFile, access } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@sanity/client";

const { PUBLIC_SANITY_PROJECT_ID: projectId, PUBLIC_SANITY_DATASET: dataset, SANITY_WRITE_TOKEN: token } = process.env;
if (!projectId || !dataset || !token) {
  console.error("Mancano variabili nel file .env: PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET, SANITY_WRITE_TOKEN");
  process.exit(1);
}

const client = createClient({ projectId, dataset, token, apiVersion: "2025-01-01", useCdn: false });
const { opere } = JSON.parse(await readFile(new URL("../src/data/opere.json", import.meta.url)));
const cartellaFoto = new URL("../src/assets/opere/", import.meta.url);

const chiave = () => randomUUID().replaceAll("-", "").slice(0, 12);
const numero = (s) => (s ? Number(String(s).replace(",", ".")) : undefined);
const tecnica = (t) => (t.includes("legno") ? "olio-legno-mare" : "olio");

async function caricaFoto(slug) {
  const file = new URL(`${slug}.jpg`, cartellaFoto);
  await access(file); // se manca, lancia un errore
  const asset = await client.assets.upload("image", createReadStream(file), { filename: `${slug}.jpg` });
  return { _type: "reference", _ref: asset._id };
}

const blocco = (testo, stile = "normal") => ({
  _type: "block",
  _key: chiave(),
  style: stile,
  markDefs: [],
  children: [{ _type: "span", _key: chiave(), text: testo, marks: [] }],
});

let errori = 0;

// 1. Temi
const temi = [
  { id: "natale", nome: "Santa Lucia e Natale" },
  { id: "fate", nome: "Fate" },
  { id: "paesaggi", nome: "Paesaggi" },
  { id: "mare", nome: "Mare e legni di mare" },
];
for (const [i, t] of temi.entries()) {
  await client.createOrReplace({
    _id: `tema-${t.id}`,
    _type: "tema",
    nome: t.nome,
    slug: { _type: "slug", current: t.id },
    ordine: (i + 1) * 10,
  });
  console.log(`tema         ${t.nome}`);
}

// 2. Impostazioni del sito
try {
  await client.createOrReplace({
    _id: "impostazioni",
    _type: "impostazioni",
    fotoApertura: { _type: "image", asset: await caricaFoto("hero"), alt: "Giuly con alcuni dei suoi quadri" },
    fraseApertura:
      "Quadri a olio dove la realtà si intreccia con l'incanto dei sogni: fate, Santa Lucia, paesi sotto la neve e legni portati dal mare.",
    chiSonoTitolo: "Un viaggio tra sogni e magie",
    chiSonoTesto: [
      blocco("Quando ho deciso di intitolare le mie opere pittoriche \"Il Magico Mondo di Giuly\", l'ho fatto perché desideravo che chiunque osservasse i miei dipinti potesse immergersi nel mio universo personale, un luogo in cui la realtà si intreccia con l'incanto dei sogni e delle magie. Dipingere per me è un'esperienza quasi mistica, un'opportunità per esplorare il profondo legame tra la luce e l'ombra, tra il reale e l'immaginario."),
      blocco("Il fascino di Santa Lucia e del Natale", "h3"),
      blocco("Uno dei soggetti ricorrenti nelle mie opere è Santa Lucia, una figura che simboleggia la luce e la speranza. La sua presenza nelle mie pitture è un omaggio alla purezza e alla bellezza delle tradizioni antiche, che continuano ad affascinarmi e a ispirarmi. Allo stesso modo, il Natale rappresenta un momento di magia e meraviglia, un tema che mi permette di giocare con i colori caldi e le atmosfere suggestive che caratterizzano questo periodo dell'anno."),
      blocco("L'incanto delle fate", "h3"),
      blocco("Le fate popolano il mio mondo pittorico, rappresentando l'essenza dell'illusione e della libertà. Queste creature eteree sono simboli di un mondo al di là del visibile, un mondo in cui la fantasia non ha limiti e ogni cosa è possibile. Attraverso le fate, esploro la mia creatività e cerco di trasmettere agli osservatori una sensazione di leggerezza e meraviglia."),
      blocco("Luci, colori e emozioni", "h3"),
      blocco("Nel \"Magico Mondo di Giuly\", le luci e i colori sono elementi fondamentali che danno vita a emozioni e sensazioni uniche. Ogni pennellata è studiata per evocare un sentimento, per raccontare una storia senza parole. La mia scelta dei colori è guidata dall'istinto, dal desiderio di creare un connubio perfetto tra armonia e contrasto, tra serenità e passione."),
      blocco("\"Il Magico Mondo di Giuly\" non è solo un titolo, ma una promessa di avventura e scoperta, un invito a entrare in un universo dove la bellezza del sogno e la potenza della magia si fondono in un'unica, meravigliosa esperienza artistica."),
    ],
    email: "giuliana.bol@virgilio.it",
    instagram: "https://www.instagram.com/ilmagicomondodigiuliana",
  });
  console.log("impostazioni del sito");
} catch (e) {
  console.error(`ERRORE       impostazioni  (${e.message})`);
  errori++;
}

// 3. Opere
for (const [i, o] of opere.entries()) {
  try {
    await client.createOrReplace({
      _id: `opera-${o.slug}`,
      _type: "opera",
      titolo: o.titolo,
      slug: { _type: "slug", current: o.slug },
      immagine: { _type: "image", asset: await caricaFoto(o.slug) },
      larghezza: numero(o.larghezza),
      altezza: numero(o.altezza),
      tecnica: tecnica(o.tecnica),
      tema: { _type: "reference", _ref: `tema-${o.categoria}` },
      ordine: (i + 1) * 10,
      venduto: false,
    });
    console.log(`opera        ${o.slug}`);
  } catch (e) {
    console.error(`ERRORE       ${o.slug}  (${e.code === "ENOENT" ? "manca la foto" : e.message})`);
    errori++;
  }
}

console.log(errori ? `\nFinito con ${errori} errori.` : `\nImportati ${temi.length} temi, le impostazioni e ${opere.length} opere.`);
