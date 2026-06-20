import { useState, useCallback } from 'react';
import { INITIAL_TABLES, INITIAL_RELATIONSHIPS, INITIAL_VALUE_OBJECTS } from '../constants';
import { syncRelationshipsWithTables, cleanRelationshipsForValueObjects } from '../utils/relationshipUtils';
import { Table, Relationship, Column, OrderBy, ValueObjectPreset, ValueObjectPropertyPreset } from '../types';
import { getVisibleColumns } from '../utils/schemaUtils';

export const useSchemaState = (
  viewOffset: { x: number; y: number },
  requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
) => {
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [relationships, setRelationships] = useState<Relationship[]>(INITIAL_RELATIONSHIPS);
  const [valueObjects, setValueObjects] = useState<ValueObjectPreset[]>(INITIAL_VALUE_OBJECTS);
  const [editingTableId, setEditingTableId] = useState<string | null>(null); 
  const [connectionMode, setConnectionMode] = useState<{ fromId: string } | null>(null); 
  const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

  const autoUpdateRelationshipType = useCallback((currentTables: Table[]) => {
      const updatedRels = syncRelationshipsWithTables(currentTables, relationships);
      setRelationships(updatedRels);
  }, [relationships]);

  // --- relationships と各テーブルカラムの isFk/reference を完全同期するラッパー ---
  const updateRelationshipsAndSync = useCallback((newRels: Relationship[]) => {
      setRelationships(newRels);
      setTables(prevTables => {
          return prevTables.map(table => {
              const childRels = newRels.filter(r => r.to === table.id && r.from && r.mappings);
              const mappedCols = new Map<string, { tableId: string; columnId: string }>();

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

              // 値オブジェクトの親カラムIDのセット
              const parentColIds = new Set(
                  table.columns.filter(c => c.parentColumnId).map(c => c.parentColumnId)
              );

              const updatedColumns = table.columns.map(col => {
                  // 値オブジェクト親カラムは絶対に外部キーにしない
                  if (parentColIds.has(col.id)) {
                      return {
                          ...col,
                          isFk: false,
                          reference: undefined
                      };
                  }

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

  const updateTableViewPane = (tableId: string, viewPane: 'main' | 'sub') => {
    setTables(tables.map(t => t.id === tableId ? { ...t, viewPane } : t));
  };

  // --- Table Operations ---
  const addTable = (canvasRef: React.RefObject<HTMLDivElement | null>) => {
    const centerX = -viewOffset.x + (canvasRef.current ? canvasRef.current.clientWidth / 2 : 100);
    const centerY = -viewOffset.y + (canvasRef.current ? canvasRef.current.clientHeight / 2 : 100);

    const newId = `table_${Date.now()}`;
    setTables([...tables, {
      id: newId,
      name: 'new_table',
      x: centerX,
      y: centerY,
      isMinimized: false,
      viewPane: 'main',
      columns: [
        { id: `col_${Date.now()}`, name: 'id', type: 'BIGINT', isPk: true, isUnique: false, isFk: false, attributeType: 'independent', derivation: '', isVisible: true }
      ],
      rows: []
    }]);
  };

  const deleteTable = (id: string) => {
    const isReferencedInTable = tables.some(t => t.id !== id && t.columns.some(c => c.type === `FK:${id}`));
    const isReferencedInVO = valueObjects.some(vo => vo.properties.some(p => p.type === `FK:${id}`));
    if (isReferencedInTable || isReferencedInVO) {
        alert("このテーブルは、値オブジェクトまたは他のテーブルのデータ型(FK)として参照されているため削除できません。");
        return;
    }
    setTables(prev => prev.filter(t => t.id !== id));
    const remainingRels = relationships.filter(r => r.from !== id && r.to !== id);
    updateRelationshipsAndSync(remainingRels);

    if (selectedRelId) setSelectedRelId(null);
    if (editingTableId === id) setEditingTableId(null);
  };

  const initiateDeleteTable = (id: string) => {
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
  };

  const updateTableName = (tableId: string, name: string) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, name } : t));
  };

  const updateTableOrderBy = (tableId: string, orderBy: OrderBy) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, orderBy } : t));
  };

  const toggleTableMinimize = (tableId: string) => {
    setTables(tables.map(t => t.id === tableId ? { ...t, isMinimized: !t.isMinimized } : t));
  };

  // --- Column Operations ---
  const addColumn = (tableId: string) => {
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

  const deleteColumn = (tableId: string, colId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const colsToDelete = [colId, ...t.columns.filter(c => c.parentColumnId === colId).map(c => c.id)];
        
        const newRows = t.rows.map(row => {
            const newRow = { ...row };
            colsToDelete.forEach(cid => delete newRow[cid]);
            return newRow;
        });
        const uqs = t.uniqueKeys || [];
        const cleanedUqs = uqs.map(uq => ({
          ...uq,
          columnIds: uq.columnIds ? uq.columnIds.filter(id => !colsToDelete.includes(id)) : []
        }));
        return {
          ...t,
          columns: t.columns.filter(c => !colsToDelete.includes(c.id)),
          rows: newRows,
          uniqueKeys: cleanedUqs
        };
      }
      return t;
    }));

    const targetTable = tables.find(t => t.id === tableId);
    const colsToDelete = targetTable 
      ? [colId, ...targetTable.columns.filter(c => c.parentColumnId === colId).map(c => c.id)] 
      : [colId];

    const cleanedRels = relationships.map(rel => {
        if (rel.to === tableId && rel.mappings) {
            return {
                ...rel,
                mappings: rel.mappings.filter(m => !colsToDelete.includes(m.childColId))
            };
        }
        if (rel.from === tableId && rel.mappings) {
            return {
                ...rel,
                mappings: rel.mappings.filter(m => m.parentColId ? !colsToDelete.includes(m.parentColId) : true)
            };
        }
        return rel;
    });
    updateRelationshipsAndSync(cleanedRels);
  };

  const updateColumn = (tableId: string, colId: string, field: keyof Column, value: any) => {
    const nextTables = tables.map(t => {
      if (t.id === tableId) {
        let updatedCols = t.columns.map(c => c.id === colId ? { ...c, [field]: value } : c);
        
        if (field === 'type') {
          const targetCol = updatedCols.find(c => c.id === colId);
          if (targetCol) {
            // 古い子カラムを削除
            updatedCols = updatedCols.filter(c => c.parentColumnId !== colId);
            
            if (value.startsWith('FK:')) {
              const refTableId = value.substring(3);
              const refTable = tables.find(t => t.id === refTableId);
              const refPkCol = refTable?.columns.find(c => c.isPk);
              if (refPkCol) {
                updatedCols = updatedCols.map(c => c.id === colId ? {
                  ...c,
                  type: value,
                  isFk: true,
                  reference: { tableId: refTableId, columnId: refPkCol.id }
                } : c);
              }
            } else {
              updatedCols = updatedCols.map(c => c.id === colId ? {
                ...c,
                type: value,
                isFk: false,
                reference: undefined
              } : c);

              const voPreset = valueObjects.find(vo => vo.name === value);
              if (voPreset) {
                const parentIndex = updatedCols.findIndex(c => c.id === colId);
                const newChildren: Column[] = voPreset.properties.map((prop: ValueObjectPropertyPreset) => ({
                  id: `col_vo_${colId}_${prop.name}`,
                  name: `${targetCol.name}_${prop.name}`,
                  type: prop.type,
                  isPk: false,
                  isUnique: false,
                  isFk: false,
                  attributeType: 'independent',
                  derivation: '',
                  isVisible: true,
                  description: prop.description,
                  parentColumnId: colId,
                  isVoProperty: true,
                  voPropertyName: prop.name
                }));
                updatedCols.splice(parentIndex + 1, 0, ...newChildren);
              }
            }
          }
        }
        
        if (field === 'name') {
          const targetCol = updatedCols.find(c => c.id === colId);
          if (targetCol) {
            const voPreset = valueObjects.find(vo => vo.name === targetCol.type);
            if (voPreset) {
              updatedCols = updatedCols.map(c => {
                if (c.parentColumnId === colId && c.isVoProperty) {
                  return {
                    ...c,
                    name: `${value}_${c.voPropertyName}`
                  };
                }
                return c;
              });
            }
          }
        }

        // 親カラムIDのセットを取得
        const parentColIds = new Set(
          updatedCols.filter(c => c.parentColumnId).map(c => c.parentColumnId)
        );

        // 親カラムについては、attributeType, derivation, isFk, reference を強制的にクリアする
        updatedCols = updatedCols.map(c => {
          if (parentColIds.has(c.id)) {
            return {
              ...c,
              attributeType: 'independent',
              derivation: '',
              isFk: false,
              reference: undefined
            };
          }
          return c;
        });

        return {
          ...t,
          columns: updatedCols
        };
      }
      return t;
    });

    setTables(nextTables);
    if (field === 'type') {
      const cleanedRels = cleanRelationshipsForValueObjects(nextTables, relationships);
      const nextRels = syncRelationshipsWithTables(nextTables, cleanedRels);
      updateRelationshipsAndSync(nextRels);
    }
  };

  const moveColumn = useCallback((tableId: string, colId: string, direction: 'up' | 'down') => {
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

  const updateColumnReference = (tableId: string, colId: string, key: string, value: any) => {
      setTables(tables.map(t => {
          if (t.id === tableId) {
              return {
                  ...t,
                  columns: t.columns.map(c => {
                      if (c.id === colId) {
                          const newReference = { ...c.reference, [key]: value } as any;
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
  const addRow = (tableId: string) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newRow: any = { id: `row_${Date.now()}` };
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

  const deleteRow = (tableId: string, rowId: string) => {
    setTables(tables.map(t => {
        if (t.id === tableId) {
            return { ...t, rows: t.rows.filter(r => r.id !== rowId) };
        }
        return t;
    }));
  };

  const updateRowValue = (tableId: string, rowId: string, colId: string, value: any) => {
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
  const addFkRelationship = (childTableId: string) => {
      const newId = `rel_${Date.now()}`;
      const newRels = [...relationships, {
          id: newId,
          from: '', 
          to: childTableId,
          type: 'non_identifying' as const,
          mappings: []
      }];
      updateRelationshipsAndSync(newRels);
  };

  const updateFkRelationshipParent = (relId: string, parentTableId: string) => {
      const newRels = relationships.map(r => {
          if (r.id === relId) {
              return {
                  ...r,
                  from: parentTableId,
                  mappings: [] 
              };
          }
          return r;
      });
      updateRelationshipsAndSync(newRels);
  };

  const toggleFkMapping = (relId: string, childColId: string, isChecked: boolean) => {
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

  const updateFkMappingParentCol = (relId: string, childColId: string, parentColId: string) => {
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
  const startConnectionMode = (tableId: string) => {
    if (connectionMode) {
      setConnectionMode(null);
    } else {
      setConnectionMode({ fromId: tableId });
      setSelectedRelId(null);
    }
  };

  const handleConnect = (targetTableId: string) => {
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
            type: 'non_identifying' as const,
            mappings: []
        }];
        updateRelationshipsAndSync(newRels);
    }
    setConnectionMode(null);
  };

  const deleteRelationship = (relId: string) => {
    const newRels = relationships.filter(r => r.id !== relId);
    updateRelationshipsAndSync(newRels);
    if (selectedRelId === relId) setSelectedRelId(null);
  };

  const addUniqueKey = (tableId: string) => {
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

  const deleteUniqueKey = (tableId: string, uqId: string) => {
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

  const toggleUniqueKeyMapping = (tableId: string, uqId: string, colId: string, isChecked: boolean) => {
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

  const updateValueObjects = (newVOs: ValueObjectPreset[]) => {
    setValueObjects(newVOs);
    
    const nextTables = tables.map(table => {
        const constraintBackup = new Map<string, Partial<Column>>();
        table.columns.forEach(c => {
          if (c.isVoProperty && c.parentColumnId && c.voPropertyName) {
            constraintBackup.set(`${c.parentColumnId}_${c.voPropertyName}`, {
              isPk: c.isPk,
              isUnique: c.isUnique,
              isFk: c.isFk,
              reference: c.reference,
              attributeType: c.attributeType,
              derivation: c.derivation,
              isVisible: c.isVisible
            });
          }
        });

        const parentCols = table.columns.filter(c => !c.isVoProperty);
        const finalCols: Column[] = [];

        parentCols.forEach(col => {
          const voPreset = newVOs.find(vo => vo.name === col.type);
          if (voPreset) {
            // 親カラム自身をクリーンアップして追加
            finalCols.push({
              ...col,
              attributeType: 'independent',
              derivation: '',
              isFk: false,
              reference: undefined
            });

            voPreset.properties.forEach((prop: ValueObjectPropertyPreset) => {
              const backupKey = `${col.id}_${prop.name}`;
              const backup = constraintBackup.get(backupKey);

              let propType = prop.type;
              let isFk = backup?.isFk ?? false;
              let reference = backup?.reference;

              if (prop.type.startsWith('FK:')) {
                const refTableId = prop.type.substring(3);
                const refTable = tables.find(t => t.id === refTableId);
                const refPkCol = refTable?.columns.find(c => c.isPk);
                if (refPkCol) {
                  propType = refPkCol.type;
                  isFk = true;
                  reference = { tableId: refTableId, columnId: refPkCol.id };
                }
              }

              finalCols.push({
                id: `col_vo_${col.id}_${prop.name}`,
                name: `${col.name}_${prop.name}`,
                type: propType,
                isPk: backup?.isPk ?? false,
                isUnique: backup?.isUnique ?? false,
                isFk: isFk,
                attributeType: backup?.attributeType ?? 'independent',
                derivation: backup?.derivation ?? '',
                isVisible: backup?.isVisible ?? true,
                description: prop.description,
                parentColumnId: col.id,
                isVoProperty: true,
                voPropertyName: prop.name,
                reference: reference
              });
            });
          } else {
            finalCols.push(col);
          }
        });

        return { ...table, columns: finalCols };
    });

    setTables(nextTables);
    
    const cleanedRels = cleanRelationshipsForValueObjects(nextTables, relationships);
    const nextRels = syncRelationshipsWithTables(nextTables, cleanedRels);
    updateRelationshipsAndSync(nextRels);
  };

  const alignSubTables = useCallback(() => {
    const subTables = tables.filter(t => t.viewPane === 'sub');
    if (subTables.length === 0) return;

    const sorted = [...subTables].sort((a, b) => a.name.localeCompare(b.name));

    const getTableWidth = (table: Table) => {
      const el = document.getElementById(`table-${table.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0) return rect.width;
      }
      
      const visibleCols = getVisibleColumns(table);
      
      let estimatedColsWidth = 0;
      visibleCols.forEach(col => {
        const nameLen = col.name ? col.name.length : 0;
        const colWidth = Math.max(100, nameLen * 8 + 30);
        estimatedColsWidth += colWidth;
      });

      return Math.max(180, estimatedColsWidth + 80);
    };

    const getTableHeight = (table: Table) => {
      const el = document.getElementById(`table-${table.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0) return rect.height;
      }
      if (table.isMinimized) return 40;
      const headerHeight = 40;
      const visibleCols = getVisibleColumns(table);
      const columnsHeight = visibleCols.length * 22;
      const rowsHeight = table.rows.length * 32;
      const footerHeight = 40;
      return headerHeight + columnsHeight + rowsHeight + footerHeight;
    };

    const col1X = 50;
    const marginX = 40;
    const marginY = 40;

    let col1Height = 40;
    let col2Height = 40;
    let maxCol1Width = 180;

    const placements = sorted.map(table => {
      const width = getTableWidth(table);
      const height = getTableHeight(table);
      
      let column: 1 | 2 = 1;
      let y = 0;

      if (col2Height < col1Height) {
        column = 2;
        y = col2Height;
        col2Height += height + marginY;
      } else {
        column = 1;
        y = col1Height;
        col1Height += height + marginY;
        if (width > maxCol1Width) {
          maxCol1Width = width;
        }
      }

      return { table, column, y };
    });

    const col2X = col1X + maxCol1Width + marginX;

    const updatedSubTables = placements.map(({ table, column, y }) => {
      const x = column === 1 ? col1X : col2X;
      return { ...table, x, y };
    });

    const subTableMap = new Map(updatedSubTables.map(t => [t.id, t]));
    setTables(tables.map(t => subTableMap.get(t.id) || t));
  }, [tables, setTables]);

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
