const { Plugin, MarkdownRenderer } = require('obsidian');

module.exports = class ProgbarPlugin extends Plugin {
    async onload() {
        this.registerMarkdownCodeBlockProcessor("progbar", async (source, el, ctx) => {
            const options = {};
            const lines = source.split("\n");
            
            lines.forEach(line => {
                const parts = line.split(":");
                if (parts.length < 2) return;
                const key = parts[0].trim();
                const val = parts.slice(1).join(":").trim();
                if (!key) return;
                
                if (val === "true") options[key] = true;
                else if (val === "false") options[key] = false;
                else if (!isNaN(Number(val)) && val !== "") options[key] = Number(val);
                else options[key] = val.replace(/^["']|["']$/g, '');
            });

            if (!options.id || String(options.id).trim() === "") {
                const errorBox = el.createDiv();
                errorBox.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
                errorBox.style.borderLeft = "4px solid red";
                errorBox.style.padding = "10px";
                errorBox.style.color = "red";
                errorBox.style.fontWeight = "bold";
                errorBox.innerText = "Error: 'id' property is required to render this progress bar.";
                return;
            };

            if (options.id && options.name === 'kitten') {
                const kittendoc = el.createDiv();
                const kitten = new Image(100,100);
                const pluginDir = this.manifest.dir;
                kitten.src = this.app.vault.adapter.getResourcePath(`${pluginDir}/kitten.jpg`);
                kitten.alt = 'eepy neko:3';
                kittendoc.appendChild(kitten);
            }

            const activeFile = this.app.workspace.getActiveFile();
            const filePath = activeFile ? activeFile.path : "unknown-file";
            const blockIndex = ctx.getSectionInfo(el)?.lineStart ?? 0;
            const contextSeed = `${filePath}#${options.id}#${blockIndex}`;
            
            let hash = 0;
            for (let i = 0; i < contextSeed.length; i++) {
                const chr = contextSeed.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            const cleanHash = Math.abs(hash).toString(16);
            const uuid = `fb-${cleanHash}-4fae-9c0d-${cleanHash}`;

            const savedData = await this.readObject(uuid);
            const max = options.max ?? 100;
            const initialValue = savedData?.value ?? options.value ?? 0;
            const name = options.name ?? 'Unnamed';
            const barWidth = options.width ?? '160px';
            const step = options.step ?? 1;
            const btnUp = options.btnUp ?? '+';
            const btnDown = options.btnDown ?? '-';
            const showName = options.showName ?? true;
            const showButtons = options.showButtons ?? true;
            const showBar = options.showBar ?? true;
            const showLabel = options.showLabel ?? true;
            const customFormat = options.customFormat ?? '[{value}/{max}] ';

            const renderTemplate = (currentVal) => {
                let percent = Math.round((currentVal / max) * 100);
                return customFormat
                    .replace("{name}", name)
                    .replace("{max}", max)
                    .replace("{value}", currentVal)
                    .replace("{val}", currentVal)
                    .replace("{id}", options.id)
                    .replace("{barWidth}", barWidth)
                    .replace("{step}", step)
                    .replace("{percent}", percent)
                    .replace("{%}", percent)
                    .replace("{percentage}", percent);
            };

            const container = el.createDiv();
            const nameLabel = container.createEl('span');
            await MarkdownRenderer.renderMarkdown(name, nameLabel, '', this);
            const renderedP = nameLabel.querySelector('p');
            if (renderedP) {
                while (renderedP.firstChild) nameLabel.insertBefore(renderedP.firstChild, renderedP);
                renderedP.remove();
            }
            const btnsub = container.createEl('button', { text: btnDown });
            const progress = container.createEl('progress', { attr: { max, value: initialValue, id: uuid } });
            const btnadd = container.createEl('button', { text: btnUp });
            const label = container.createEl('span', { text: renderTemplate(initialValue) });

            nameLabel.style.marginRight = "10px";
            progress.style.marginRight = "10px";
            progress.style.width = barWidth;
            btnsub.style.marginRight = "10px";
            btnadd.style.marginLeft = "10px";
            btnadd.style.marginRight = "10px";

            if (!showName) nameLabel.style.display = 'none';
            if (!showBar) progress.style.display = 'none';
            if (!showLabel) label.style.display = 'none';
            if (!showButtons) {
                btnadd.style.display = 'none';
                btnsub.style.display = 'none';
            }

            btnadd.addEventListener('click', async () => {
                if (progress.value < max) {
                    progress.value += step;
                    label.innerText = renderTemplate(progress.value);
                    await this.writeObject(progress.id, { value: progress.value, userDefinedId: options.id });
                }
            });

            btnsub.addEventListener('click', async () => {
                if (progress.value > 0) {
                    progress.value -= step;
                    label.innerText = renderTemplate(progress.value);
                    await this.writeObject(progress.id, { value: progress.value, userDefinedId: options.id });
                }
            });
        });
    }

    async readObject(id) {
        const globalStorage = await this.loadData() || {};
        return globalStorage[id] || null;
    }

    async writeObject(id, data) {
        const globalStorage = await this.loadData() || {};
        if (!globalStorage[id]) globalStorage[id] = {};
        globalStorage[id] = Object.assign({}, globalStorage[id], data);
        await this.saveData(globalStorage);
    }
}
