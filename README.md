# Il Magico Mondo di Giuly

Sito statico in Astro con la galleria dei quadri di Giuly.

## Avvio

    npm install
    npm run immagini   # scarica le foto dal vecchio sito Google in src/assets/opere/
    npm run dev        # http://localhost:4321

`npm run immagini` è consigliato: senza, il sito mostra le immagini direttamente da Google Sites
(funziona, ma non sono ottimizzate e i link Google possono cambiare). Con le immagini in locale
Astro genera WebP in più larghezze e la versione grande per la lightbox.

## Aggiungere o modificare un quadro

1. Metti la foto in `src/assets/opere/` con un nome tipo `la-fata-blu-30x40.jpg`
2. Aggiungi una voce in `src/data/opere.json` con lo stesso `slug`:

       { "slug": "la-fata-blu-30x40", "titolo": "La fata blu", "categoria": "fate",
         "tecnica": "Olio", "larghezza": "30", "altezza": "40", "src": "" }

L'ordine nel JSON è l'ordine sulla pagina. Le categorie si modificano in `src/data/categorie.ts`.
La foto grande in apertura è `src/assets/opere/hero.jpg`.

## Pubblicazione

    npm run build

Il risultato in `dist/` è HTML statico: va su Netlify, Cloudflare Pages, GitHub Pages o qualsiasi server web.
Ricordati di impostare il dominio vero in `astro.config.mjs`.
