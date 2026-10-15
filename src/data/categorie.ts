// Le chiavi corrispondono al campo "categoria" in opere.json.
// Rinomina, riordina o aggiungi categorie liberamente.
export const categorie = [
  { id: "natale", nome: "Santa Lucia e Natale" },
  { id: "fate", nome: "Fate" },
  { id: "paesaggi", nome: "Paesaggi" },
  { id: "mare", nome: "Mare e legni di mare" },
] as const;

export type CategoriaId = (typeof categorie)[number]["id"];
