export interface FileExporter {
  exportJson(filename: string, jsonString: string): Promise<void>;
}
