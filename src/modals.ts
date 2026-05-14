import { App, Modal, Notice, TFile } from "obsidian";

export class TextInputModal extends Modal {
  private label: string;
  private placeholder: string;
  private multiline: boolean;
  private onSubmit: (value: string) => void | Promise<void>;

  constructor(app: App, label: string, placeholder: string, multiline: boolean, onSubmit: (value: string) => void | Promise<void>) {
    super(app);
    this.label = label;
    this.placeholder = placeholder;
    this.multiline = multiline;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.label });

    let value = "";
    if (this.multiline) {
      const ta = contentEl.createEl("textarea", { attr: { placeholder: this.placeholder, rows: "10", style: "width:100%;resize:vertical;" } });
      ta.addEventListener("input", () => (value = ta.value));
    } else {
      const input = contentEl.createEl("input", { attr: { type: "text", placeholder: this.placeholder, style: "width:100%;" } });
      input.addEventListener("input", () => (value = input.value));
    }

    const btn = contentEl.createEl("button", { text: "Valider", attr: { style: "margin-top:12px;" } });
    btn.addEventListener("click", () => {
      this.close();
      this.onSubmit(value);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class ConfirmModal extends Modal {
  private message: string;
  private titre: string;
  private onConfirm: () => void | Promise<void>;

  constructor(app: App, message: string, titre: string, onConfirm: () => void | Promise<void>) {
    super(app);
    this.message = message;
    this.titre = titre;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.titre });
    contentEl.createEl("p", { text: this.message });

    const row = contentEl.createDiv({ attr: { style: "display:flex;gap:8px;margin-top:12px;" } });
    const btnOui = row.createEl("button", { text: "Oui" });
    const btnNon = row.createEl("button", { text: "Non" });

    btnOui.addEventListener("click", () => { this.close(); this.onConfirm(); });
    btnNon.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class ResultatsModal extends Modal {
  private titre: string;
  private texte: string;
  private fichiers: TFile[];

  constructor(app: App, titre: string, texte: string, fichiers: TFile[]) {
    super(app);
    this.titre = titre;
    this.texte = texte;
    this.fichiers = fichiers;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: this.titre });
    this.fichiers.forEach((f, i) => {
      const ligne = contentEl.createDiv({ attr: { style: "margin:4px 0;" } });
      const score = this.texte.split("\n")[i]?.split("—")[0]?.trim() ?? "";
      ligne.createEl("span", { text: `${score} `, attr: { style: "color:var(--text-muted);font-size:12px;" } });
      const lien = ligne.createEl("a", { text: f.basename, attr: { style: "cursor:pointer;" } });
      lien.addEventListener("click", () => {
        void this.app.workspace.getLeaf().openFile(f);
        this.close();
      });
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class NotePreviewModal extends Modal {
  private contenu: string;
  private dossiers: string[];
  private onSave: (contenu: string, dossier: string, nom: string) => void | Promise<void>;

  constructor(app: App, contenu: string, dossiers: string[], onSave: (contenu: string, dossier: string, nom: string) => void | Promise<void>) {
    super(app);
    this.contenu = contenu;
    this.dossiers = dossiers;
    this.onSave = onSave;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Note générée — aperçu" });

    const pre = contentEl.createEl("pre", { attr: { style: "max-height:300px;overflow:auto;background:var(--background-secondary);padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;" } });
    pre.textContent = this.contenu;

    contentEl.createEl("hr");

    contentEl.createEl("label", { text: "Dossier :" });
    const select = contentEl.createEl("select", { attr: { style: "width:100%;margin-bottom:8px;" } });
    select.createEl("option", { value: "", text: "(racine du vault)" });
    this.dossiers.forEach((d) => select.createEl("option", { value: d, text: d }));

    contentEl.createEl("label", { text: "Nom de la note :" });
    const input = contentEl.createEl("input", { attr: { type: "text", placeholder: "nom-de-la-note", style: "width:100%;margin-bottom:12px;" } });

    const btn = contentEl.createEl("button", { text: "Sauvegarder" });
    btn.addEventListener("click", () => {
      const nom = input.value.trim().replace(/\.md$/, "");
      if (!nom) { new Notice("Donne un nom à la note."); return; }
      this.close();
      this.onSave(this.contenu, select.value, nom);
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class TraiterNoteModal extends Modal {
  private resultat: string;
  private onConfirm: () => void | Promise<void>;

  constructor(app: App, resultat: string, onConfirm: () => void | Promise<void>) {
    super(app);
    this.resultat = resultat;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Résultat — aperçu" });

    const pre = contentEl.createEl("pre", { attr: { style: "max-height:350px;overflow:auto;background:var(--background-secondary);padding:8px;border-radius:4px;white-space:pre-wrap;font-size:12px;" } });
    pre.textContent = this.resultat;

    contentEl.createEl("hr");

    const row = contentEl.createDiv({ attr: { style: "display:flex;gap:8px;margin-top:12px;" } });
    const btnOui = row.createEl("button", { text: "Appliquer" });
    const btnNon = row.createEl("button", { text: "Annuler" });

    btnOui.addEventListener("click", () => { this.close(); this.onConfirm(); });
    btnNon.addEventListener("click", () => this.close());
  }

  onClose() {
    this.contentEl.empty();
  }
}
