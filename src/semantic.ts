import { App, TFile } from "obsidian";

const STOP_WORDS = new Set([
  "le","la","les","un","de","des","du","et","en","au","aux","ce","se","sa","son","ses",
  "que","qui","une","est","dans","par","sur","pour","avec","plus","pas","ne","je","il",
  "elle","nous","vous","ils","elles","on","mais","ou","donc","car","ni","the","a","an",
  "is","in","of","to","and","or","that","this","it","with","for","as","are","was","be",
]);

function extraireMotsCles(texte: string, topN = 20): string[] {
  const mots = texte
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôùûüç\s]/g, " ")
    .split(/\s+/)
    .filter((m) => m.length > 3 && !STOP_WORDS.has(m));

  const freq: Record<string, number> = {};
  for (const m of mots) freq[m] = (freq[m] ?? 0) + 1;

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([mot]) => mot);
}

function scorerNote(contenu: string, motsCles: string[]): number {
  const texte = contenu.toLowerCase();
  return motsCles.reduce((acc, mot) => acc + (texte.includes(mot) ? 1 : 0), 0);
}

export class RechercheSemantiqueService {
  private app: App;
  private cache = new Map<string, { mtime: number; contenu: string }>();

  constructor(app: App) {
    this.app = app;
  }

  async rechercherTopN(requete: string, topN = 10): Promise<{ file: TFile; score: number }[]> {
    const notes = this.app.vault.getMarkdownFiles();
    if (!notes.length) return [];

    const motsCles = extraireMotsCles(requete);

    const scores: { file: TFile; score: number }[] = [];
    for (const note of notes) {
      const cached = this.cache.get(note.path);
      const contenu = cached && cached.mtime === note.stat.mtime
        ? cached.contenu
        : await this.app.vault.cachedRead(note);
      if (!cached || cached.mtime !== note.stat.mtime) {
        this.cache.set(note.path, { mtime: note.stat.mtime, contenu });
      }
      const score = scorerNote(contenu, motsCles);
      if (score > 0) scores.push({ file: note, score });
    }

    return scores.sort((a, b) => b.score - a.score).slice(0, topN);
  }

  async filtrerNotesContexte(sujet: string, topN = 15): Promise<string[]> {
    const resultats = await this.rechercherTopN(sujet, topN);
    // Si pas assez de résultats par mots-clés, compléter avec les notes récentes
    const noms = new Set(resultats.map((r) => r.file.basename));
    if (resultats.length < topN) {
      this.app.vault
        .getMarkdownFiles()
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(0, topN - resultats.length)
        .forEach((f) => noms.add(f.basename));
    }
    return Array.from(noms);
  }
}
