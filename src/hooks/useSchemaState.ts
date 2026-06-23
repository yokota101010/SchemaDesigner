import { useState, useCallback } from 'react';
import { INITIAL_TABLES, INITIAL_RELATIONSHIPS, INITIAL_VALUE_OBJECTS } from '../constants';
import { Table, Relationship, Column, OrderBy, ValueObjectPreset } from '../domain/models';
import { SchemaUseCase } from '../ports/inbound/SchemaUseCase';

export const useSchemaState = (
  viewOffset: { x: number; y: number },
  requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void,
  schemaUseCase: SchemaUseCase
) => {
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [relationships, setRelationships] = useState<Relationship[]>(INITIAL_RELATIONSHIPS);
  const [valueObjects, setValueObjects] = useState<ValueObjectPreset[]>(INITIAL_VALUE_OBJECTS);
  const [editingTableId, setEditingTableId] = useState<string | null>(null); 
  const [connectionMode, setConnectionMode] = useState<{ fromId: string } | null>(null); 
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

  const autoUpdateRelationshipType = useCallback((currentTables: Table[]) => {
      // 内部的には SchemaUseCase 経由でリレーションシップ同期を実行
      const { relationships: nextRels } = schemaUseCase.updateColumn(
        '', '', 'isPk', false, // 影響のないダミー値で同期計算だけをトリガー
        currentTables, relationships, valueObjects
      );
      setRelationships(nextRels);
  }, [relationships, valueObjects, schemaUseCase]);

  const updateTableViewPane = useCallback((tableId: string, viewPane: 'main' | 'sub') => {
    const nextTables = schemaUseCase.updateTableViewPane(tableId, viewPane, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  // --- Table Operations ---
  const addTable = useCallback((canvasRef: React.RefObject<HTMLDivElement | null>) => {
    const width = canvasRef.current ? canvasRef.current.clientWidth : 800;
    const height = canvasRef.current ? canvasRef.current.clientHeight : 600;
    const nextTables = schemaUseCase.addTable(tables, viewOffset, width, height);
    setTables(nextTables);
  }, [tables, viewOffset, schemaUseCase]);

  const deleteTable = useCallback((id: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.deleteTable(id, tables, relationships, valueObjects);
    setTables(nextTables);
    setRelationships(nextRels);

    if (selectedRelId) setSelectedRelId(null);
    if (editingTableId === id) setEditingTableId(null);
  }, [tables, relationships, valueObjects, selectedRelId, editingTableId, schemaUseCase]);

  const initiateDeleteTable = useCallback((id: string) => {
      const isReferencedInTable = tables.some(t => t.id !== id && t.columns.some(c => c.type === `FK:${id}`));
      const isReferencedInVO = valueObjects.some(vo => vo.properties.some(p => p.type === `FK:${id}`));
      if (isReferencedInTable || isReferencedInVO) {
          alert("このテーブルは、値オブジェクトまたは他のテーブルのデータ型(FK)として参照されているため削除できません。");
          return;
      }
      requestConfirmation(
          "テーブル削除",
          "このテーブルを削除しますか？関連するリレーションも削除されます。",
          () => deleteTable(id),
          true
      );
  }, [tables, valueObjects, deleteTable, requestConfirmation]);

  const updateTableName = useCallback((tableId: string, name: string) => {
    const nextTables = schemaUseCase.updateTableName(tableId, name, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const updateTableOrderBy = useCallback((tableId: string, orderBy: OrderBy) => {
    const nextTables = schemaUseCase.updateTableOrderBy(tableId, orderBy, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const toggleTableMinimize = useCallback((tableId: string) => {
    const nextTables = schemaUseCase.toggleTableMinimize(tableId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  // --- Column Operations ---
  const addColumn = useCallback((tableId: string) => {
    const nextTables = schemaUseCase.addColumn(tableId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const deleteColumn = useCallback((tableId: string, colId: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.deleteColumn(tableId, colId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  const updateColumn = useCallback((tableId: string, colId: string, field: keyof Column, value: any) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.updateColumn(tableId, colId, field, value, tables, relationships, valueObjects);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, valueObjects, schemaUseCase]);

  const moveColumn = useCallback((tableId: string, colId: string, direction: 'up' | 'down') => {
    const nextTables = schemaUseCase.moveColumn(tableId, colId, direction, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const updateColumnReference = useCallback((tableId: string, colId: string, key: string, value: any) => {
    const nextTables = schemaUseCase.updateColumnReference(tableId, colId, key, value, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  // --- Row Operations ---
  const addRow = useCallback((tableId: string) => {
    const nextTables = schemaUseCase.addRow(tableId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const deleteRow = useCallback((tableId: string, rowId: string) => {
    const nextTables = schemaUseCase.deleteRow(tableId, rowId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const updateRowValue = useCallback((tableId: string, rowId: string, colId: string, value: any) => {
    const nextTables = schemaUseCase.updateRowValue(tableId, rowId, colId, value, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  // --- Dynamic FK Columns Operations ---
  const addFkRelationship = useCallback((childTableId: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.addFkRelationship(childTableId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  const updateFkRelationshipParent = useCallback((relId: string, parentTableId: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.updateFkRelationshipParent(relId, parentTableId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  const toggleFkMapping = useCallback((relId: string, childColId: string, isChecked: boolean) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.toggleFkMapping(relId, childColId, isChecked, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  const updateFkMappingParentCol = useCallback((relId: string, childColId: string, parentColId: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.updateFkMappingParentCol(relId, childColId, parentColId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  // --- Connections ---
  const startConnectionMode = useCallback((tableId: string) => {
    if (connectionMode) {
      setConnectionMode(null);
    } else {
      setConnectionMode({ fromId: tableId });
      setSelectedRelId(null);
    }
  }, [connectionMode]);

  const handleConnect = useCallback((targetTableId: string) => {
    if (!connectionMode) return;
    if (connectionMode.fromId === targetTableId) {
        setConnectionMode(null);
        return;
    }
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.connectTables(connectionMode.fromId, targetTableId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
    setConnectionMode(null);
  }, [connectionMode, tables, relationships, schemaUseCase]);

  const deleteRelationship = useCallback((relId: string) => {
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.deleteRelationship(relId, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
    if (selectedRelId === relId) setSelectedRelId(null);
  }, [tables, relationships, selectedRelId, schemaUseCase]);

  const addUniqueKey = useCallback((tableId: string) => {
    const nextTables = schemaUseCase.addUniqueKey(tableId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const deleteUniqueKey = useCallback((tableId: string, uqId: string) => {
    const nextTables = schemaUseCase.deleteUniqueKey(tableId, uqId, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const toggleUniqueKeyMapping = useCallback((tableId: string, uqId: string, colId: string, isChecked: boolean) => {
    const nextTables = schemaUseCase.toggleUniqueKeyMapping(tableId, uqId, colId, isChecked, tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  const updateValueObjects = useCallback((newVOs: ValueObjectPreset[]) => {
    setValueObjects(newVOs);
    const { tables: nextTables, relationships: nextRels } = schemaUseCase.updateValueObjects(newVOs, tables, relationships);
    setTables(nextTables);
    setRelationships(nextRels);
  }, [tables, relationships, schemaUseCase]);

  const alignSubTables = useCallback(() => {
    const nextTables = schemaUseCase.alignSubTables(tables);
    setTables(nextTables);
  }, [tables, schemaUseCase]);

  return {
    tables, setTables,
    relationships, setRelationships,
    valueObjects, setValueObjects, updateValueObjects,
    editingTableId, setEditingTableId,
    connectionMode, setConnectionMode,
    selectedRelId, setSelectedRelId,
    autoUpdateRelationshipType,
    addTable, deleteTable, initiateDeleteTable,
    updateTableName, updateTableOrderBy, toggleTableMinimize,
    updateTableViewPane,
    alignSubTables,
    addColumn, deleteColumn, updateColumn, updateColumnReference,
    moveColumn,
    addRow, deleteRow, updateRowValue,
    startConnectionMode, handleConnect, deleteRelationship,
    addFkRelationship, updateFkRelationshipParent, toggleFkMapping, updateFkMappingParentCol,
    addUniqueKey, deleteUniqueKey, toggleUniqueKeyMapping
  };
};
