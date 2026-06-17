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

  // --- relationships と各テーブルカラムの isFk/reference を完全同期するラッパー ---
  const updateRelationshipsAndSync = useCallback((newRels) => {
      setRelationships(newRels);
      setTables(prevTables => {
          return prevTables.map(table => {
              // このテーブルが子テーブルとなるマッピング情報を集約
              const childRels = newRels.filter(r => r.to === table.id && r.from && r.mappings);
              const mappedCols = new Map(); // childColId -> { tableId, columnId }

              childRels.forEach(rel => {
                  rel.mappings.forEach(m => {
                      if (m.childColId) {
                          mappedCols.set(m.childColId, {
                              tableId: rel.from,
                              columnId: m.parentColId || ''
                          });
                      }
                  });
              });

              const updatedColumns = table.columns.map(col => {
                  const fkInfo = mappedCols.get(col.id);
                  if (fkInfo) {
                      return {
                          ...col,
                          isFk: true,
                          reference: fkInfo
                      };
                  } else {
                      return {
                          ...col,
                          isFk: false,
                          reference: undefined
                      };
                  }
              });

              return { ...table, columns: updatedColumns };
          });
      });
  }, [setRelationships, setTables]);

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
    
    // テーブル削除に伴い、関連するリレーションシップも削除・同期
    const remainingRels = relationships.filter(r => r.from !== id && r.to !== id);
    updateRelationshipsAndSync(remainingRels);

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

  const updateTableOrderBy = (tableId, orderBy) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, orderBy } : t));
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
        const uqs = t.uniqueKeys || [];
        const cleanedUqs = uqs.map(uq => ({
          ...uq,
          columnIds: uq.columnIds ? uq.columnIds.filter(id => id !== colId) : []
        }));
        return {
          ...t,
          columns: t.columns.filter(c => c.id !== colId),
          rows: newRows,
          uniqueKeys: cleanedUqs
        };
      }
      return t;
    }));

    // 削除されたカラムに関連するリレーションシップのマッピングも自動削除・同期
    const cleanedRels = relationships.map(rel => {
        if (rel.to === tableId && rel.mappings) {
            return {
                ...rel,
                mappings: rel.mappings.filter(m => m.childColId !== colId)
            };
        }
        if (rel.from === tableId && rel.mappings) {
            return {
                ...rel,
                mappings: rel.mappings.filter(m => m.parentColId !== colId)
            };
        }
        return rel;
    });
    updateRelationshipsAndSync(cleanedRels);
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

  const moveColumn = useCallback((tableId, colId, direction) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id === tableId) {
        const index = t.columns.findIndex(c => c.id === colId);
        if (index === -1) return t;
        
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= t.columns.length) return t;
        
        const newColumns = [...t.columns];
        const temp = newColumns[index];
        newColumns[index] = newColumns[targetIndex];
        newColumns[targetIndex] = temp;
        
        return {
          ...t,
          columns: newColumns
        };
      }
      return t;
    }));
  }, [setTables]);

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

  // --- Dynamic FK Columns Operations ---
  const addFkRelationship = (childTableId) => {
      const newId = `rel_${Date.now()}`;
      const newRels = [...relationships, {
          id: newId,
          from: '', 
          to: childTableId,
          type: 'non_identifying',
          mappings: []
      }];
      updateRelationshipsAndSync(newRels);
  };

  const updateFkRelationshipParent = (relId, parentTableId) => {
      const newRels = relationships.map(r => {
          if (r.id === relId) {
              return {
                  ...r,
                  from: parentTableId,
                  mappings: [] // 親が変わるため、マッピングはリセット
              };
          }
          return r;
      });
      updateRelationshipsAndSync(newRels);
  };

  const toggleFkMapping = (relId, childColId, isChecked) => {
      const newRels = relationships.map(r => {
          if (r.id === relId) {
              let newMappings = r.mappings ? [...r.mappings] : [];
              if (isChecked) {
                  if (!newMappings.some(m => m.childColId === childColId)) {
                      newMappings.push({
                          parentColId: '',
                          childColId: childColId
                      });
                  }
              } else {
                  newMappings = newMappings.filter(m => m.childColId !== childColId);
              }
              return { ...r, mappings: newMappings };
          }
          return r;
      });
      updateRelationshipsAndSync(newRels);
  };

  const updateFkMappingParentCol = (relId, childColId, parentColId) => {
      const newRels = relationships.map(r => {
          if (r.id === relId) {
              const newMappings = r.mappings ? r.mappings.map(m => {
                  if (m.childColId === childColId) {
                      return { ...m, parentColId: parentColId };
                  }
                  return m;
              }) : [];
              return { ...r, mappings: newMappings };
          }
          return r;
      });
      updateRelationshipsAndSync(newRels);
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
        const newRels = [...relationships, {
            id: `rel_${Date.now()}`,
            from: connectionMode.fromId, 
            to: targetTableId,           
            type: 'non_identifying',
            mappings: [] // マッピング初期値
        }];
        updateRelationshipsAndSync(newRels);
    }
    setConnectionMode(null);
  };

  const deleteRelationship = (relId) => {
    const newRels = relationships.filter(r => r.id !== relId);
    updateRelationshipsAndSync(newRels);
    if (selectedRelId === relId) setSelectedRelId(null);
  };

  const addUniqueKey = (tableId) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        return {
          ...t,
          uniqueKeys: [
            ...uqs,
            { id: `uq_${Date.now()}`, columnIds: [] }
          ]
        };
      }
      return t;
    }));
  };

  const deleteUniqueKey = (tableId, uqId) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        return {
          ...t,
          uniqueKeys: uqs.filter(uq => uq.id !== uqId)
        };
      }
      return t;
    }));
  };

  const toggleUniqueKeyMapping = (tableId, uqId, colId, isChecked) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        const updatedUqs = uqs.map(uq => {
          if (uq.id === uqId) {
            let colIds = uq.columnIds ? [...uq.columnIds] : [];
            if (isChecked) {
              if (!colIds.includes(colId)) {
                colIds.push(colId);
              }
            } else {
              colIds = colIds.filter(id => id !== colId);
            }
            return { ...uq, columnIds: colIds };
          }
          return uq;
        });
        return {
          ...t,
          uniqueKeys: updatedUqs
        };
      }
      return t;
    }));
  };

  return {
    tables, setTables,
    relationships, setRelationships,
    editingTableId, setEditingTableId,
    connectionMode, setConnectionMode,
    selectedRelId, setSelectedRelId,
    autoUpdateRelationshipType,
    addTable, deleteTable, initiateDeleteTable,
    updateTableName, updateTableOrderBy, toggleTableMinimize,
    addColumn, deleteColumn, updateColumn, updateColumnReference,
    moveColumn,
    addRow, deleteRow, updateRowValue,
    startConnectionMode, handleConnect, deleteRelationship,
    addFkRelationship, updateFkRelationshipParent, toggleFkMapping, updateFkMappingParentCol,
    addUniqueKey, deleteUniqueKey, toggleUniqueKeyMapping
  };
};
