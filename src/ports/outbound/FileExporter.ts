export interface FileExporter {
  exportFile(filename: string, content: string, mimeType: string, extension: string): Promise<void>;
}
