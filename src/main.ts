import { App, Notice, Plugin, TFile, TFolder, moment } from "obsidian";
import { appelClaude, AppelClaudeEchoue } from "./claude";
import { DEFAULT_SETTINGS, LiminalSettingTab, LiminalSettings } from "./settings";
import { RechercheSemantiqueService } from "./semantic";
import { recupererTranscription } from "./video";
import { TextInputModal, ConfirmModal, ResultatsModal, NotePreviewModal, TraiterNoteModal } from "./modals";

export default class LiminalPlugin extends Plugin {
  settings: LiminalSettings;
  semantique: RechercheSemantiqueService;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new LiminalSettingTab(this.app, this));
    this.semantique = new RechercheSemantiqueService(this.app);

    this.addCommand({
      id: "generer-note",
      name: "Générer une note depuis un texte brut",
      callback: () => this.cmdGenererNote(),
    });

    this.addCommand({
      id: "suggerer-tags",
      name: "Suggérer des tags pour la note active",
      callback: () => this.cmdSuggererTags(),
    });

    this.addCommand({
      id: "suggerer-liens",
      name: "Suggérer des liens pour la note active",
      callback: () => this.cmdSuggererLiens(),
    });

    this.addCommand({
      id: "traiter-note",
      name: "Traiter la note active avec une instruction",
      callback: () => this.cmdTraiterNote(),
    });

    this.addCommand({
      id: "recherche-semantique",
      name: "Recherche sémantique dans le vault",
      callback: () => this.cmdRechercheSemantiqueque(),
    });

    this.addCommand({
      id: "note-depuis-video",
      name: "Générer une note depuis une vidéo YouTube",
      callback: () => this.cmdNoteDepuisVideo(),
    });

    this.addCommand({
      id: "creer-dossier",
      name: "Créer un nouveau dossier",
      callback: () => this.cmdCreerDossier(),
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<LiminalSettings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // ─── Utilitaires vault ───────────────────────────────────────────────────

  private dateAujourdhui(): string {
    return moment().format("DD/MM/YYYY");
  }

  private listerNotes(): string {
    return this.app.vault
      .getMarkdownFiles()
      .map((f) => f.path)
      .join("\n");
  }

  private listerDossiers(): string[] {
    const dossiers: string[] = [];
    this.app.vault.getAllLoadedFiles().forEach((f) => {
      if (f instanceof TFolder && f.path !== "/") dossiers.push(f.path);
    });
    return dossiers.sort();
  }

  private async lireNote(file: TFile): Promise<string> {
    return await this.app.vault.read(file);
  }

  private async modifierNote(file: TFile, contenu: string): Promise<void> {
    await this.app.vault.modify(file, contenu);
  }

  private setSection(contenu: string, titre: string, contenuSection: string): string {
    const marqueur = `## ${titre}`;
    contenuSection = contenuSection.trim();

    if (contenu.includes(marqueur)) {
      const [avant, apres] = contenu.split(marqueur);
      const avantTrim = avant.trimEnd();
      const reste = apres.includes("\n## ")
        ? "\n\n## " + apres.split("\n## ").slice(1).join("\n## ")
        : "";
      return `${avantTrim}\n\n${marqueur}\n${contenuSection}${reste}`.trimEnd() + "\n";
    } else {
      return contenu.trimEnd() + `\n\n${marqueur}\n${contenuSection}\n`;
    }
  }

  private filtrerLiensMarkdown(contenu: string): string {
    const notesExistantes = new Set(
      this.app.vault.getMarkdownFiles().map((f) => f.basename.toLowerCase())
    );
    return contenu.split(/(\[\[[^\]]+\]\])/).map((part) => {
      if (!part.startsWith("[[")) return part;
      const nom = part.slice(2, -2).trim();
      return notesExistantes.has(nom.toLowerCase()) ? part : "";
    }).join("");
  }

  private verifierApiKey(): boolean {
    if (!this.settings.apiKey) {
      new Notice("Liminal : clé API Anthropic manquante. Configure-la dans les settings du plugin.");
      return false;
    }
    return true;
  }

  // ─── Génération de note ──────────────────────────────────────────────────

  private async genererNoteComplete(texteBrut: string): Promise<string> {
    const listeNotes = this.listerNotes();
    const reponse = await appelClaude(
      this.settings.apiKey,
      this.settings.model,
      [
        {
          role: "user",
          content: `Tu es Liminal, un assistant qui structure des notes approfondies pour un vault Obsidian.

À partir du texte brut ci-dessous, génère une note complète et approfondie en markdown.

Structure attendue :

# Titre
(titre précis qui reflète le sujet central)

## Résumé
(3-5 phrases : idée principale, angle, pourquoi ça compte)

## Idées clés
(liste de 4 à 6 bullet points — une idée forte par bullet, formulée comme une affirmation)

## Contenu
(développement structuré avec sous-sections ### si plusieurs axes. Minimum 200 mots. Développe les arguments, les nuances, les implications — ne résume pas.)

## Tags
(2 ou 3 tags format #tag, pas plus)

## Liens
(maximum 3 liens vers des notes existantes format [[nom]])

Date : ${this.dateAujourdhui()}
Notes existantes dans le vault : ${listeNotes}

Texte brut :
${texteBrut}

Réponds uniquement avec le contenu markdown de la note, rien d'autre.`,
        },
      ],
      2048
    );
    return this.filtrerLiensMarkdown(reponse.trim());
  }

  private async genererNoteDepuisVideo(texteBrut: string): Promise<string> {
    const listeNotes = this.listerNotes();
    const reponse = await appelClaude(
      this.settings.apiKey,
      this.settings.model,
      [
        {
          role: "user",
          content: `Tu es Liminal, un assistant qui structure des notes approfondies pour un vault Obsidian.

À partir de la transcription ci-dessous, génère une note complète en markdown.

# Titre

## Résumé
(3-5 phrases : thèse principale, angle, pourquoi ça compte)

## Idées clés
(5 à 8 bullet points — une affirmation forte par bullet)

## Contenu
(développement structuré avec ### si plusieurs axes. Minimum 300 mots. Développe, ne résume pas.)

## Citations notables
(2 à 4 extraits directs ou paraphrases proches)

## Tags
(2 ou 3 tags format #tag, pas plus)

## Liens
(maximum 3 liens vers des notes existantes format [[nom]])

Date : ${this.dateAujourdhui()}
Notes existantes dans le vault : ${listeNotes}

Transcription :
${texteBrut}

Réponds uniquement avec le contenu markdown, rien d'autre.`,
        },
      ],
      3000
    );
    return this.filtrerLiensMarkdown(reponse.trim());
  }

  private async suggererTags(contenu: string): Promise<string> {
    const reponse = await appelClaude(
      this.settings.apiKey,
      this.settings.model,
      [
        {
          role: "user",
          content: `Analyse cette note et génère 2 ou 3 tags pertinents. Pas plus de 3.
Réponds UNIQUEMENT avec les tags séparés par des espaces, avec # devant chaque tag. Rien d'autre.
Exemple : #philosophie #camus

Note :
${contenu}`,
        },
      ],
      50
    );
    const tags = reponse
      .trim()
      .split(/\s+/)
      .filter((t) => t.startsWith("#"))
      .slice(0, 3);
    return tags.join(" ");
  }

  private async suggererLiens(contenu: string): Promise<string[]> {
    // Pré-filtre sémantique : on n'envoie à Claude que les 15 notes les plus proches
    const notesProches = await this.semantique.filtrerNotesContexte(contenu, 15);
    const listeFiltrée = notesProches.join("\n");

    const reponse = await appelClaude(
      this.settings.apiKey,
      this.settings.model,
      [
        {
          role: "user",
          content: `Voici une note et une sélection de notes conceptuellement proches du vault.
Identifie maximum 3 notes de cette liste qui sont les plus liées à la note analysée.
Réponds uniquement avec les noms des fichiers liés, un par ligne, sans extension .md, sans explication.

Note à analyser :
${contenu}

Notes candidates :
${listeFiltrée}`,
        },
      ],
      300
    );

    const notesExistantes = new Set(
      this.app.vault.getMarkdownFiles().map((f) => f.basename.toLowerCase())
    );
    return reponse
      .trim()
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && notesExistantes.has(s.toLowerCase()))
      .slice(0, 3);
  }

  // ─── Commandes ───────────────────────────────────────────────────────────

  private cmdGenererNote() {
    if (!this.verifierApiKey()) return;
    new TextInputModal(
      this.app,
      "Colle ton texte brut",
      "Texte...",
      true,
      async (texte) => {
        if (!texte.trim()) return;
        const notice = new Notice("Liminal : génération en cours…", 0);
        try {
          const noteGeneree = await this.genererNoteComplete(texte);
          notice.hide();
          new NotePreviewModal(this.app, noteGeneree, this.listerDossiers(), async (contenu, dossier, nom) => {
            const chemin = dossier ? `${dossier}/${nom}.md` : `${nom}.md`;
            const existant = this.app.vault.getAbstractFileByPath(chemin);
            if (existant instanceof TFile) {
              await this.modifierNote(existant, contenu);
            } else {
              await this.app.vault.create(chemin, contenu);
            }
            new Notice(`Note '${nom}' créée.`);
          }).open();
        } catch (e) {
          notice.hide();
          new Notice(`Liminal : erreur — ${e instanceof AppelClaudeEchoue ? e.message : e}`);
        }
      }
    ).open();
  }

  private async cmdSuggererTags() {
    if (!this.verifierApiKey()) return;
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("Liminal : aucune note active."); return; }

    const notice = new Notice("Liminal : suggestion de tags…", 0);
    try {
      const contenu = await this.lireNote(file);
      const tags = await this.suggererTags(contenu);
      notice.hide();
      new ConfirmModal(
        this.app,
        `Tags suggérés : ${tags}`,
        "Appliquer ces tags ?",
        async () => {
          const nouveau = this.setSection(contenu, "Tags", tags);
          await this.modifierNote(file, nouveau);
          new Notice("Tags mis à jour.");
        }
      ).open();
    } catch (e) {
      notice.hide();
      new Notice(`Liminal : erreur — ${e instanceof AppelClaudeEchoue ? e.message : e}`);
    }
  }

  private async cmdSuggererLiens() {
    if (!this.verifierApiKey()) return;
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("Liminal : aucune note active."); return; }

    const notice = new Notice("Liminal : suggestion de liens…", 0);
    try {
      const contenu = await this.lireNote(file);
      const suggestions = await this.suggererLiens(contenu);
      if (!suggestions.length) {
        notice.hide();
        new Notice("Liminal : aucun lien valide trouvé.");
        return;
      }
      notice.hide();
      const apercu = suggestions.map((s) => `[[${s}]]`).join(", ");
      new ConfirmModal(
        this.app,
        `Liens suggérés : ${apercu}`,
        "Appliquer ces liens ?",
        async () => {
          const liens = suggestions.map((s) => `[[${s}]]`).join("\n");
          const nouveau = this.setSection(contenu, "Liens", liens);
          await this.modifierNote(file, nouveau);
          new Notice(`${suggestions.length} lien(s) mis à jour.`);
        }
      ).open();
    } catch (e) {
      notice.hide();
      new Notice(`Liminal : erreur — ${e instanceof AppelClaudeEchoue ? e.message : e}`);
    }
  }

  private cmdRechercheSemantiqueque() {
    new TextInputModal(
      this.app,
      "Recherche sémantique",
      "Décris ce que tu cherches…",
      false,
      async (requete) => {
        if (!requete.trim()) return;
        const notice = new Notice("Liminal : recherche en cours…", 0);
        try {
          const resultats = await this.semantique.rechercherTopN(requete, 5);
          notice.hide();
          const texte = resultats
            .map((r) => `${(r.score * 100).toFixed(0)}% — ${r.file.path}`)
            .join("\n");
          new ResultatsModal(this.app, `Résultats pour : "${requete}"`, texte, resultats.map((r) => r.file)).open();
        } catch (e) {
          notice.hide();
          new Notice(`Liminal : erreur — ${e}`);
        }
      }
    ).open();
  }

  private cmdNoteDepuisVideo() {
    if (!this.verifierApiKey()) return;
    new TextInputModal(
      this.app,
      "URL YouTube",
      "https://www.youtube.com/watch?v=...",
      false,
      async (url) => {
        if (!url.trim()) return;
        const notice = new Notice("Liminal : récupération de la transcription…", 0);
        try {
          let transcription: string;
          try {
            transcription = await recupererTranscription(url.trim());
          } catch (_) {
            notice.hide();
            // Fallback : coller la transcription manuellement
            new TextInputModal(
              this.app,
              "Sous-titres introuvables — colle la transcription manuellement",
              "Colle ici le texte de la vidéo…",
              true,
              async (texte) => {
                if (!texte.trim()) return;
                const n2 = new Notice("Liminal : génération de la note…", 0);
                try {
                  const note = await this.genererNoteDepuisVideo(`Source : ${url}\n\n${texte}`);
                  n2.hide();
                  new NotePreviewModal(this.app, note, this.listerDossiers(), async (contenu, dossier, nom) => {
                    const chemin = dossier ? `${dossier}/${nom}.md` : `${nom}.md`;
                    const existant = this.app.vault.getAbstractFileByPath(chemin);
                    if (existant instanceof TFile) await this.modifierNote(existant, contenu);
                    else await this.app.vault.create(chemin, contenu);
                    new Notice(`Note '${nom}' créée.`);
                  }).open();
                } catch (err) {
                  n2.hide();
                  new Notice(`Liminal : erreur — ${err instanceof Error ? err.message : err}`);
                }
              }
            ).open();
            return;
          }
          notice.setMessage("Liminal : génération de la note…");
          const MAX_MOTS = 15_000;
          const mots = transcription.split(" ");
          const texte = (mots.length > MAX_MOTS ? mots.slice(0, MAX_MOTS).join(" ") : transcription);
          const noteGeneree = await this.genererNoteDepuisVideo(`Source : ${url}\n\n${texte}`);
          notice.hide();
          new NotePreviewModal(this.app, noteGeneree, this.listerDossiers(), async (contenu, dossier, nom) => {
            const chemin = dossier ? `${dossier}/${nom}.md` : `${nom}.md`;
            const existant = this.app.vault.getAbstractFileByPath(chemin);
            if (existant instanceof TFile) {
              await this.modifierNote(existant, contenu);
            } else {
              await this.app.vault.create(chemin, contenu);
            }
            new Notice(`Note '${nom}' créée.`);
          }).open();
        } catch (e) {
          notice.hide();
          new Notice(`Liminal : ${e instanceof Error ? e.message : e}`);
        }
      }
    ).open();
  }

  private cmdCreerDossier() {
    new TextInputModal(
      this.app,
      "Nom du nouveau dossier",
      "Ex : Sciences, Projets/Side Projects…",
      false,
      async (nom) => {
        if (!nom.trim()) return;
        const chemin = nom.trim();
        const existant = this.app.vault.getAbstractFileByPath(chemin);
        if (existant) { new Notice(`Le dossier '${chemin}' existe déjà.`); return; }
        await this.app.vault.createFolder(chemin);
        new Notice(`Dossier '${chemin}' créé.`);
      }
    ).open();
  }

  private cmdTraiterNote() {
    if (!this.verifierApiKey()) return;
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice("Liminal : aucune note active."); return; }

    new TextInputModal(
      this.app,
      "Instruction pour Claude",
      "Ex : résume cette note, traduis en anglais…",
      false,
      async (instruction) => {
        if (!instruction.trim()) return;
        const notice = new Notice("Liminal : traitement en cours…", 0);
        try {
          const contenu = await this.lireNote(file);
          const resultat = await appelClaude(
            this.settings.apiKey,
            this.settings.model,
            [
              {
                role: "user",
                content: `${instruction}\n\nDate d'aujourd'hui : ${this.dateAujourdhui()}\n\nVoici la note :\n\n${contenu}`,
              },
            ],
            2048
          );
          notice.hide();
          new TraiterNoteModal(
            this.app,
            resultat,
            async () => {
              await this.modifierNote(file, resultat);
              new Notice("Note mise à jour.");
            }
          ).open();
        } catch (e) {
          notice.hide();
          new Notice(`Liminal : erreur — ${e instanceof AppelClaudeEchoue ? e.message : e}`);
        }
      }
    ).open();
  }
}

