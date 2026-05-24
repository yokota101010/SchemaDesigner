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
     */
    const DEFAULT_PROJECT_NAME = 'Untitled Project';

    const INITIAL_TABLES = [
      {
        id: 'orders',
        name: 'orders',
        x: 50,
        y: 50,
        isMinimized: false,
        columns: [
          { id: 'o1', name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
          { id: 'o2', name: 'order_number', type: 'VARCHAR(255)', isPk: false, isUnique: true, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
          { id: 'o3', name: 'order_date', type: 'DATE', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
        ],
        rows: [
          { id: 'r1', o1: '1001', o2: 'ORD-2023-001', o3: '2023-10-01' },
        ]
      },
      {
        id: 'products',
        name: 'products',
        x: 50,
        y: 250,
        isMinimized: true,
        columns: [
          { id: 'pr1', name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
          { id: 'pr2', name: 'name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
          { id: 'pr3', name: 'price', type: 'DECIMAL', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
        ],
        rows: [
          { id: 'prow1', pr1: '500', pr2: 'Laptop', pr3: '1200' },
          { id: 'prow2', pr1: '501', pr2: 'Mouse', pr3: '25.5' },
        ]
      },
      {
        id: 'order_items',
        name: 'order_items',
        x: 400,
        y: 50,
        isMinimized: false,
        columns: [
          { 
              id: 'oi1', name: 'order_id', type: 'BIGINT', isPk: true, isUnique: false, isFk: true, attributeType: 'independent', derivation: '', isVisible: true,
              reference: { tableId: 'orders', columnId: 'o1' } 
          },
          { id: 'oi2', name: 'line_number', type: 'INT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true },
          { 
              id: 'oi3', name: 'product_id', type: 'BIGINT', isPk: false, isUnique: false, isFk: true, attributeType: 'independent', derivation: '', isVisible: true,
              reference: { tableId: 'products', columnId: 'pr1' } 
          },
          { 
            id: 'oi4', name: 'product_name', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'dependent', derivation: 'products.name (via product_id)', isVisible: true
          },
        ],
        rows: [
          { id: 'r1', oi1: '1001', oi2: '1', oi3: '500', oi4: 'Laptop' },
          { id: 'r2', oi1: '1001', oi2: '2', oi3: '501', oi4: 'Mouse' },
        ]
      }
    ];

    const INITIAL_RELATIONSHIPS = [
      { id: 'r1', from: 'orders', to: 'order_items', type: 'identifying' },
      { id: 'r2', from: 'products', to: 'order_items', type: 'non_identifying' }
    ];

    const INITIAL_CRUD_FUNCTIONS = [
      { id: 'f1', name: '注文登録' },
      { id: 'f2', name: '商品検索' }
    ];

    const INITIAL_CRUD_DATA = {
      'f1': {
          'orders': ['C'],
          'order_items': ['C'],
          'products': ['R']
      },
      'f2': {
          'products': ['R']
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
