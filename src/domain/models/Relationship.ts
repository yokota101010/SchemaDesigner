export interface RelationshipMapping {
  parentColId: string;
  childColId: string;
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: 'identifying' | 'non_identifying';
  mappings: RelationshipMapping[];
}
