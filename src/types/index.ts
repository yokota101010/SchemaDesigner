export interface ColumnReference {
  tableId: string;
  columnId: string;
}

export interface Column {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isUnique?: boolean;
  isFk: boolean;
  attributeType: 'independent' | 'dependent';
  derivation: string;
  isVisible: boolean;
  description?: string;
  reference?: ColumnReference;
  isSelfContainedDependent?: boolean;
  isFirstPhaseCalculable?: boolean;
}

export interface UniqueKey {
  id: string;
  columnIds: string[];
}

export interface OrderByKey {
  columnId: string;
  direction: 'ASC' | 'DESC';
}

export interface OrderBy {
  type: 'pk' | 'uq' | '';
  uqId: string;
  direction?: 'ASC' | 'DESC';
  directions?: Record<string, 'ASC' | 'DESC'>;
  keys?: OrderByKey[];
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  isMinimized: boolean;
  columns: Column[];
  rows: any[]; // 行データは動的キーなので any または Record<string, any>
  orderBy?: OrderBy;
  uniqueKeys?: UniqueKey[];
}

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

export interface CrudFunction {
  id: string;
  name: string;
}

export interface CrudData {
  [functionId: string]: {
    [tableId: string]: string[];
  };
}

export interface ProjectData {
  name: string;
  tables: Table[];
  relationships: Relationship[];
  crudFunctions: CrudFunction[];
  crudData: CrudData;
  aiInstructions: string;
  version?: string;
  exportedAt?: string;
}
