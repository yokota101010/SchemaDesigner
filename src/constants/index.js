/**
 * データ型定義
 */
const DATA_TYPES = [
  'INT', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 
  'DATE', 'TIMESTAMP', 'DECIMAL', 'FLOAT'
];

/**
 * 属性区分定義
 */
const ATTRIBUTE_TYPES = [
  { value: 'independent', label: '独立', color: 'bg-gray-50' },
  { value: 'dependent', label: '導出項目', color: 'bg-orange-50' }
];

/**
 * 初期データ (テンプレート)
 * チュートリアルとしても機能する、複合主キーと複合外部キー、導出項目を含むコンパクトな店舗・社員・タスクアサインモデル
 */
const DEFAULT_PROJECT_NAME = 'Tutorial Project (Composite Key Demo)';

const INITIAL_TABLES = [
  {
    id: 'branches',
    name: 'branches',
    x: 50,
    y: 50,
    isMinimized: false,
    columns: [
      { id: 'b1', name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
      { id: 'b2', name: 'name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true }
    ],
    rows: [
      { id: 'brow1', b1: '1', b2: '東京本社' },
      { id: 'brow2', b1: '2', b2: '大阪支店' }
    ]
  },
  {
    id: 'employees',
    name: 'employees',
    x: 50,
    y: 280,
    isMinimized: false,
    columns: [
      { 
        id: 'e1', name: 'branch_id', type: 'BIGINT', isPk: true, isUnique: false, isFk: true, attributeType: 'independent', derivation: '', isVisible: true,
        reference: { tableId: 'branches', columnId: 'b1' } 
      },
      { id: 'e2', name: 'employee_no', type: 'INT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
      { id: 'e3', name: 'name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true }
    ],
    rows: [
      { id: 'erow1', e1: '1', e2: '101', e3: '山田 太郎' },
      { id: 'erow2', e1: '1', e2: '102', e3: '佐藤 花子' },
      { id: 'erow3', e1: '2', e2: '101', e3: '鈴木 一郎' }
    ]
  },
  {
    id: 'assigned_tasks',
    name: 'assigned_tasks',
    x: 450,
    y: 100,
    isMinimized: false,
    columns: [
      { id: 't1', name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
      { 
        id: 't2', name: 'branch_id', type: 'BIGINT', isPk: false, isUnique: false, isFk: true, attributeType: 'independent', derivation: '', isVisible: true,
        reference: { tableId: 'employees', columnId: 'e1' } 
      },
      { 
        id: 't3', name: 'employee_no', type: 'INT', isPk: false, isUnique: false, isFk: true, attributeType: 'independent', derivation: '', isVisible: true,
        reference: { tableId: 'employees', columnId: 'e2' } 
      },
      { id: 't4', name: 'task_name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
      { id: 't5', name: 'employee_name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'dependent', derivation: 'employees.name (via branch_id, employee_no)', isVisible: true }
    ],
    rows: [
      { id: 'trow1', t1: '1', t2: '1', t3: '101', t4: '要件定義', t5: '山田 太郎' },
      { id: 'trow2', t1: '2', t2: '2', t3: '101', t4: '設計レビュー', t5: '鈴木 一郎' }
    ]
  }
];

const INITIAL_RELATIONSHIPS = [
  { 
    id: 'r1', 
    from: 'branches', 
    to: 'employees', 
    type: 'identifying',
    mappings: [
      { parentColId: 'b1', childColId: 'e1' }
    ]
  },
  { 
    id: 'r2', 
    from: 'employees', 
    to: 'assigned_tasks', 
    type: 'non_identifying',
    mappings: [
      { parentColId: 'e1', childColId: 't2' },
      { parentColId: 'e2', childColId: 't3' }
    ]
  }
];

const INITIAL_CRUD_FUNCTIONS = [
  { id: 'f1', name: '社員登録' },
  { id: 'f2', name: 'タスク割当' }
];

const INITIAL_CRUD_DATA = {
  'f1': {
      'branches': ['R'],
      'employees': ['C']
  },
  'f2': {
      'employees': ['R'],
      'assigned_tasks': ['C']
  }
};

const STORAGE_KEY = 'schema-designer-projects-v1';

export {
  DATA_TYPES,
  ATTRIBUTE_TYPES,
  DEFAULT_PROJECT_NAME,
  INITIAL_TABLES,
  INITIAL_RELATIONSHIPS,
  INITIAL_CRUD_FUNCTIONS,
  INITIAL_CRUD_DATA,
  STORAGE_KEY
};
