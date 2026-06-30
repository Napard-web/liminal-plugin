import { App, PluginSettingTab, Setting } from "obsidian";
import type LiminalPlugin from "./main";

export interface LiminalSettings {
  apiKey: string;
  model: string;
}

export const DEFAULT_SETTINGS: LiminalSettings = {
  apiKey: "",
  model: "claude-sonnet-4-6",
};

export class LiminalSettingTab extends PluginSettingTab {
  plugin: LiminalPlugin;

  constructor(app: App, plugin: LiminalPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Clé API Anthropic")
      .setDesc("Ta clé API depuis console.anthropic.com")
      .addText((text) =>
        text
          .setPlaceholder("sk-ant-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Modèle")
      .setDesc("Modèle Claude à utiliser")
      .addDropdown((drop) =>
        drop
          .addOption("claude-sonnet-4-6", "Claude Sonnet 4.6 (recommandé)")
          .addOption("claude-opus-4-7", "Claude Opus 4.7 (plus puissant)")
          .addOption("claude-haiku-4-5-20251001", "Claude Haiku 4.5 (plus rapide)")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
            this.plugin.updateStatusBar();
          })
      );
  }
}
