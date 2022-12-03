import { App, Modal, Setting } from 'obsidian';
import { getParser, Parser, ParserResult } from 'parser'

export class ImportModal extends Modal {
    url: string;
	result: ParserResult | null;
    selectedParser?: Parser
	onSubmit: (result: ParserResult | null) => void;

	constructor(app: App, onSubmit: (result: ParserResult | null) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

    async trySubmittingResult() {
        if (this.selectedParser) {
            this.close();
            this.result = await this.selectedParser?.parse(this.url);
            this.onSubmit(this.result);
        }
    }

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h1", { text: "What's the paper's URL?" });

		new Setting(contentEl)
		.setName("URL")
		.addText((text) => {
			text.onChange((value) => {
                this.url = value;
                this.selectedParser = getParser(value);

                if (this.selectedParser){
                    button.setDisabled(false);
                    button.setDesc("");
                } else {
                    button.setDisabled(true);
                    button.setDesc("Unsupported paper website.");
                }
			});
            text.inputEl.addEventListener("keyup", ({key}) => {
                if (key == "Enter") {
                    this.trySubmittingResult();
                }
            })
        });

		const button = new Setting(contentEl)
		.addButton((btn) =>
			btn
			.setButtonText("Import")
			.setCta()
			.onClick(this.trySubmittingResult));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}