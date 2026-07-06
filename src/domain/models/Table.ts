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
  // 値オブジェクト関連
  parentColumnId?: string;
  isVoProperty?: boolean;
  voPropertyName?: string;
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
  viewPane?: 'main' | 'sub';
  description?: string;
}
