import { FileExporter } from '../../ports/outbound/FileExporter';

export class BrowserFileExporter implements FileExporter {
  async exportJson(filename: string, jsonString: string): Promise<void> {
    try {
      if ((window as any).showSaveFilePicker) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
      } else {
        const fileName = window.prompt("保存するファイル名を入力してください", filename);
        if (!fileName) return;

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
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
