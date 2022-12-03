import { Editor, MarkdownView, Notice, Plugin, TFile, App, PluginSettingTab, Setting} from 'obsidian';
import { ImportModal } from 'modal';
import { ParserResult } from 'parser';

// Remember to rename these classes and interfaces!

interface PaperImportSettings {
	template: string;
	defaultPaperFolder: string;
}

const DEFAULT_SETTINGS: PaperImportSettings = {
	template: 'Title: {{TITLE}}\nAuthors: {{AUTHORS}}\nAbstract: {{ABSTRACT}}',
	defaultPaperFolder: ""
}

function formatDate(date: Date) : string {
	return "{0}-{1}-{2}".format(date.getFullYear().toString(), date.getMonth().toString(), date.getDate().toString());
}

export default class PaperImport extends Plugin {
	settings: PaperImportSettings;

	filloutTemplate(result: ParserResult) : string {
		const dateNow = new Date(Date.now());
		let content = this.settings.template;
		content = content.replace("{{TITLE}}", result.title);
		content = content.replace("{{AUTHOR}}", result.author);
		content = content.replace("{{ABSTRACT}}", result.abstract);
		content = content.replace("{{DATEPUBLISHED}}", formatDate(result.datePublished));
		content = content.replace("{{DATEREAD}}", formatDate(dateNow));
		content = content.replace("{{URL}}", result.url);
		return content
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
			id: 'import-paper',
			name: 'Import Paper',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new ImportModal(this.app, (result) => {
					if (result != null) {
						editor.setValue(this.filloutTemplate(result));
					}
				}).open();
			}
		});

		this.addCommand({
			id: 'import-paper-new-file',
			name: 'Import Paper (Create File)',
			callback : () => {
				if (this.settings.defaultPaperFolder.length == 0) {
					new Notice('Paper notes folder not declared in settings.')
					return;
				}
				new ImportModal(this.app, async (result) => {
					if (result != null) {
						const content = this.filloutTemplate(result)
						
						try {
							await app.vault.createFolder(this.settings.defaultPaperFolder);
						} catch {
							console.log("Folder already exists.")
						}

						let fileName = result.title + ".md";
						fileName = fileName.replace(/:/g, "-");
						fileName = fileName.replace(/\?\/\\\}\{\[\]/g, "");
						const filePath = this.settings.defaultPaperFolder + "/" + fileName;
						
						if (app.vault.getAbstractFileByPath(filePath) instanceof TFile) {
							new Notice(`File for paper ('${result.title}') already exists.`);
							return;
						}

						const file = await app.vault.create(filePath, content);
						if (file instanceof TFile) {
							if (app.workspace.getMostRecentLeaf() == null) {
								return;
							}
							app.workspace.getMostRecentLeaf()?.openFile(file);
						}
					}
				}).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: PaperImport;

	constructor(app: App, plugin: PaperImport) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for Paper Import plugin.'});

		new Setting(containerEl)
			.setName('Template to populate paper notes')
			.setDesc('Placeholders to use are:\n{{TITLE}}, {{AUTHOR}}, {{ABSTRACT}}, {{DATEPUBLISHED}}, {{DATEREAD}}, {{URL}}.')
			.addTextArea(text => {
				text
				.setValue(this.plugin.settings.template)
				.onChange(async (value) => {
					this.plugin.settings.template = value;
					await this.plugin.saveSettings();
				});
				text.inputEl.rows = 15;
				text.inputEl.cols = 50;
			});

        new Setting(containerEl)
			.setName('Paper notes folder')
			.setDesc('Path to folder to place new notes in')
			.addText(text => {
				text
				.setValue(this.plugin.settings.defaultPaperFolder)
				.onChange(async (value) => {
					this.plugin.settings.defaultPaperFolder = value;
					await this.plugin.saveSettings();
				});
			});
	}
}