import { ProjectData } from '../../domain/models';

export interface ProjectRepository {
  save(data: ProjectData): Promise<void>;
  load(): Promise<ProjectData | null>;
}
