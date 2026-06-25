import { FileExporter } from '../../ports/outbound/FileExporter';

export class BrowserFileExporter implements FileExporter {
  async exportFile(filename: string, content: string, mimeType: string, extension: string): Promise<void> {
    try {
      if ((window as any).showSaveFilePicker) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: `${extension.toUpperCase()} File`,
            accept: { [mimeType]: [`.${extension}`] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const fileName = window.prompt("保存するファイル名を入力してください", filename);
        if (!fileName) return;

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error saving file via File System Access API:", error);
        throw new Error("ファイルの保存に失敗しました。");
      }
    }
  }
}
