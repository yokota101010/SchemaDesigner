import { Table, Aggregate, AggregateData } from '../../domain/models';

export interface AggregateUseCase {
  addAggregate(aggregates: Aggregate[]): Aggregate[];
  updateAggregateName(id: string, name: string, aggregates: Aggregate[]): Aggregate[];
  deleteAggregate(
    id: string, 
    aggregates: Aggregate[], 
    aggregateData: AggregateData,
    onConfirmed: (nextAggs: Aggregate[], nextData: AggregateData) => void,
    requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
  ): void;
  assignTableToAggregate(
    tableId: string,
    targetAggregateId: string,
    role: 'R' | 'M',
    tables: Table[],
    aggregates: Aggregate[],
    aggregateData: AggregateData,
    onConfirmed: (nextData: AggregateData) => void,
    requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
  ): void;
  removeTableFromAggregate(tableId: string, aggregateData: AggregateData): AggregateData;
  alignTablesByAggregate(tables: Table[], aggregates: Aggregate[], aggregateData: AggregateData): string[];
}
