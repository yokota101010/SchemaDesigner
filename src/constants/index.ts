import { Relationship, CrudFunction, CrudData, Table } from '../types';

/**
 * データ型定義
 */
const DATA_TYPES: string[] = [
  'INT', 'BIGINT', 'VARCHAR(255)', 'TEXT', 'BOOLEAN', 
  'DATE', 'TIMESTAMP', 'DECIMAL', 'FLOAT'
];

/**
 * 属性区分定義
 */
const ATTRIBUTE_TYPES = [
  { value: 'independent', label: '独立', color: 'bg-gray-50' },
  { value: 'dependent', label: '導出項目', color: 'bg-orange-50' }
] as const;

/**
 * 初期データ (テンプレート)
 * 初期状態は何もデータがない状態で開始します
 */
const DEFAULT_PROJECT_NAME = 'New Project';

const INITIAL_TABLES: Table[] = [];

const INITIAL_RELATIONSHIPS: Relationship[] = [];

const INITIAL_CRUD_FUNCTIONS: CrudFunction[] = [];

const INITIAL_CRUD_DATA: CrudData = {};

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
