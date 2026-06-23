import { Relationship, Table, ValueObjectPreset, ValueObjectPropertyPreset, Aggregate, AggregateData } from '../domain/models';

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



const INITIAL_AGGREGATES: Aggregate[] = [];

const INITIAL_AGGREGATE_DATA: AggregateData = {};

const INITIAL_AGGREGATE_TABLE_ORDER: string[] = [];

const STORAGE_KEY = 'schema-designer-projects-v1';



const INITIAL_VALUE_OBJECTS: ValueObjectPreset[] = [
  {
    name: 'Money',
    description: '金額(amount)は0以上の正の数。ただし通貨(currency)が\'JPY\'の場合は正の整数のみ許容し、\'USD\'の場合は小数点以下2桁まで許容する。',
    properties: [
      { name: 'amount', type: 'DECIMAL', description: '金額数値' },
      { name: 'currency', type: 'VARCHAR(255)', description: '通貨コード' }
    ]
  },
  {
    name: 'Address',
    description: '郵便番号(postalCode)は7桁ハイフンなしの数字。都道府県(state)は47都道府県名であること。',
    properties: [
      { name: 'postalCode', type: 'VARCHAR(255)', description: '郵便番号' },
      { name: 'state', type: 'VARCHAR(255)', description: '都道府県' },
      { name: 'city', type: 'VARCHAR(255)', description: '市区町村' },
      { name: 'line1', type: 'VARCHAR(255)', description: '住所番地' }
    ]
  }
];

export {
  DATA_TYPES,
  ATTRIBUTE_TYPES,
  DEFAULT_PROJECT_NAME,
  INITIAL_TABLES,
  INITIAL_RELATIONSHIPS,
  INITIAL_AGGREGATES,
  INITIAL_AGGREGATE_DATA,
  INITIAL_AGGREGATE_TABLE_ORDER,
  STORAGE_KEY,
  INITIAL_VALUE_OBJECTS
};
