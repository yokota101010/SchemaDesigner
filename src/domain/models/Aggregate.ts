export interface Aggregate {
  id: string;
  name: string;
}

export interface AggregateAssignment {
  aggregateId: string;
  role: 'R' | 'M';
}

export interface AggregateData {
  [tableId: string]: AggregateAssignment;
}
