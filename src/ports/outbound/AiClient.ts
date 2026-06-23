import { Table, Relationship, ValueObjectPreset } from '../../domain/models';

export interface AiClient {
  generateMockData(
    tables: Table[],
    relationships: Relationship[],
    apiKey: string,
    count: number,
    initialInstructions: string,
    otherInstructions: string,
    valueObjects: ValueObjectPreset[]
  ): Promise<Record<string, any[]>>;
}
