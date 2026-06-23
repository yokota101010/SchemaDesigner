import { Table } from './Table';
import { Relationship } from './Relationship';
import { ValueObjectPreset } from './ValueObject';
import { Aggregate, AggregateData } from './Aggregate';

export interface ProjectData {
  name: string;
  tables: Table[];
  relationships: Relationship[];
  valueObjects?: ValueObjectPreset[];
  aggregates?: Aggregate[];
  aggregateData?: AggregateData;
  aggregateTableOrder?: string[];
  version?: string;
  exportedAt?: string;
}
