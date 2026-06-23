import { ProjectRepository } from '../../ports/outbound/ProjectRepository';
import { ProjectData } from '../../domain/models';

export class LocalStorageProjectRepository implements ProjectRepository {
  private STORAGE_KEY = 'schema-designer-autosave-v1';

  async save(data: ProjectData): Promise<void> {
    const serialized = JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(this.STORAGE_KEY, serialized);
  }

  async load(): Promise<ProjectData | null> {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      // テーブルの rows が配列であることを保証するクリーンアップ
      const cleanedTables = (parsed.tables || []).map((t: any) => ({
        ...t,
        rows: Array.isArray(t.rows) ? t.rows : []
      }));

      return {
        ...parsed,
        tables: cleanedTables
      };
    } catch (e) {
      console.error("Error parsing auto-save project data:", e);
      return null;
    }
  }
}
