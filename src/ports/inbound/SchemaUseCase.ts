import { Table, Relationship, Column, OrderBy, ValueObjectPreset } from '../../domain/models';

export interface SchemaUseCase {
  addTable(tables: Table[], viewOffset: { x: number; y: number }, canvasWidth: number, canvasHeight: number): Table[];
  deleteTable(tableId: string, tables: Table[], relationships: Relationship[], valueObjects: ValueObjectPreset[]): { tables: Table[], relationships: Relationship[] };
  updateTableName(tableId: string, name: string, tables: Table[]): Table[];
  updateTableOrderBy(tableId: string, orderBy: OrderBy, tables: Table[]): Table[];
  toggleTableMinimize(tableId: string, tables: Table[]): Table[];
  updateTableViewPane(tableId: string, viewPane: 'main' | 'sub', tables: Table[]): Table[];
  alignSubTables(tables: Table[]): Table[];
  
  addColumn(tableId: string, tables: Table[]): Table[];
  deleteColumn(tableId: string, colId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  updateColumn(
    tableId: string, 
    colId: string, 
    field: keyof Column, 
    value: any, 
    tables: Table[], 
    relationships: Relationship[], 
    valueObjects: ValueObjectPreset[]
  ): { tables: Table[], relationships: Relationship[] };
  moveColumn(tableId: string, colId: string, direction: 'up' | 'down', tables: Table[]): Table[];
  updateColumnReference(tableId: string, colId: string, key: string, value: any, tables: Table[]): Table[];
  
  addRow(tableId: string, tables: Table[]): Table[];
  deleteRow(tableId: string, rowId: string, tables: Table[]): Table[];
  updateRowValue(tableId: string, rowId: string, colId: string, value: any, tables: Table[]): Table[];
  
  addFkRelationship(childTableId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  updateFkRelationshipParent(relId: string, parentTableId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  toggleFkMapping(relId: string, childColId: string, isChecked: boolean, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  updateFkMappingParentCol(relId: string, childColId: string, parentColId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  
  connectTables(fromId: string, toId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  deleteRelationship(relId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
  
  addUniqueKey(tableId: string, tables: Table[]): Table[];
  deleteUniqueKey(tableId: string, uqId: string, tables: Table[]): Table[];
  toggleUniqueKeyMapping(tableId: string, uqId: string, colId: string, isChecked: boolean, tables: Table[]): Table[];
  
  updateValueObjects(newVOs: ValueObjectPreset[], tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] };
}
