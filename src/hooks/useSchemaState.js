import { useState, useCallback } from 'react';
import { INITIAL_TABLES, INITIAL_RELATIONSHIPS } from '../constants';
import { syncRelationshipsWithTables } from '../utils/relationshipUtils';

export const useSchemaState = (viewOffset, requestConfirmation) => {
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [relationships, setRelationships] = useState(INITIAL_RELATIONSHIPS);
  const [editingTableId, setEditingTableId] = useState(null); 
  const [connectionMode, setConnectionMode] = useState(null); 
  const [selectedRelId, setSelectedRelId] = useState(null);

  const autoUpdateRelationshipType = useCallback((currentTables) => {
      const updatedRels = syncRelationshipsWithTables(currentTables, relationships);
      setRelationships(updatedRels);
  }, [relationships]);

  // --- Table Operations ---
  const addTable = (canvasRef) => {
    const centerX = -viewOffset.x + (canvasRef.current ? canvasRef.current.clientWidth / 2 : 100);
    const centerY = -viewOffset.y + (canvasRef.current ? canvasRef.current.clientHeight / 2 : 100);

    const newId = `table_${Date.now()}`;
    setTables([...tables, {
      id: newId,
      name: 'new_table',
      x: centerX,
      y: centerY,
      isMinimized: false,
      columns: [
        { id: `col_${Date.now()}`, name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true }
      ],
      rows: []
    }]);
  };

  const deleteTable = (id) => {
    setTables(prev => prev.filter(t => t.id !== id));
    setRelationships(prev => prev.filter(r => r.from !== id && r.to !== id));
    if (selectedRelId) setSelectedRelId(null);
    if (editingTableId === id) setEditingTableId(null);
  };

  const initiateDeleteTable = (id) => {
      requestConfirmation(
          "テーブル削除",
          "このテーブルを削除しますか？関連するリレーションも削除されます。",
          () => deleteTable(id),
          true
      );
  };

  const updateTableName = (tableId, name) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, name } : t));
  };

  const toggleTableMinimize = (tableId) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, isMinimized: !t.isMinimized } : t));
  };

  // --- Column Operations ---
  const addColumn = (tableId) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: [
            ...t.columns,
            { id: `col_${Date.now()}`, name: 'new_col', type: 'VARCHAR(255)', isPk: false, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true }
          ]
        };
      }
      return t;
    }));
  };

  const deleteColumn = (tableId, colId) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newRows = t.rows.map(row => {
            const newRow = { ...row };
            delete newRow[colId];
            return newRow;
        });
        return {
          ...t,
          columns: t.columns.filter(c => c.id !== colId),
          rows: newRows
        };
      }
      return t;
    }));
  };

  const updateColumn = (tableId, colId, field, value) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          columns: t.columns.map(c => c.id === colId ? { ...c, [field]: value } : c)
        };
      }
      return t;
    }));
  };

  const updateColumnReference = (tableId, colId, key, value) => {
      setTables(tables.map(t => {
          if (t.id === tableId) {
              return {
                  ...t,
                  columns: t.columns.map(c => {
                      if (c.id === colId) {
                          const newReference = { ...c.reference, [key]: value };
                          if (key === 'tableId') {
                              newReference.columnId = '';
                          }
                          return { ...c, reference: newReference };
                      }
                      return c;
                  })
              };
          }
          return t;
      }));
  };

  // --- Row Operations ---
  const addRow = (tableId) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newRow = { id: `row_${Date.now()}` };
        t.columns.forEach(col => newRow[col.id] = '');
        return { 
            ...t, 
            rows: [...t.rows, newRow],
            isMinimized: false 
        };
      }
      return t;
    }));
  };

  const deleteRow = (tableId, rowId) => {
    setTables(tables.map(t => {
        if (t.id === tableId) {
            return { ...t, rows: t.rows.filter(r => r.id !== rowId) };
        }
        return t;
    }));
  };

  const updateRowValue = (tableId, rowId, colId, value) => {
    setTables(tables.map(t => {
        if (t.id === tableId) {
            return {
                ...t,
                rows: t.rows.map(r => r.id === rowId ? { ...r, [colId]: value } : r)
            };
        }
        return t;
    }));
  };

  // --- Connections ---
  const startConnectionMode = (tableId) => {
    if (connectionMode) {
      setConnectionMode(null);
    } else {
      setConnectionMode({ fromId: tableId });
      setSelectedRelId(null);
    }
  };

  const handleConnect = (targetTableId) => {
    if (!connectionMode) return;
    if (connectionMode.fromId === targetTableId) {
        setConnectionMode(null);
        return;
    }
    const exists = relationships.some(
        r => (r.from === connectionMode.fromId && r.to === targetTableId) ||
             (r.from === targetTableId && r.to === connectionMode.fromId)
    );
    if (!exists) {
        setRelationships([...relationships, {
            id: `rel_${Date.now()}`,
            from: connectionMode.fromId, 
            to: targetTableId,           
            type: 'non_identifying'
        }]);
    }
    setConnectionMode(null);
  };

  const deleteRelationship = (relId) => {
    setRelationships(relationships.filter(r => r.id !== relId));
    if (selectedRelId === relId) setSelectedRelId(null);
  };

  return {
    tables, setTables,
    relationships, setRelationships,
    editingTableId, setEditingTableId,
    connectionMode, setConnectionMode,
    selectedRelId, setSelectedRelId,
    autoUpdateRelationshipType,
    addTable, deleteTable, initiateDeleteTable,
    updateTableName, toggleTableMinimize,
    addColumn, deleteColumn, updateColumn, updateColumnReference,
    addRow, deleteRow, updateRowValue,
    startConnectionMode, handleConnect, deleteRelationship
  };
};
