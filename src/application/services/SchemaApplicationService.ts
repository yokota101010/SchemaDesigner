import { SchemaUseCase } from '../../ports/inbound/SchemaUseCase';
import { Table, Relationship, Column, OrderBy, ValueObjectPreset, ValueObjectPropertyPreset } from '../../domain/models';
import { syncRelationshipsWithTables, cleanRelationshipsForValueObjects, syncTableColumnsWithRelationships } from '../../domain/services/relationshipSync';
import { calculateAlignSubTablesPlacements } from '../../domain/services/layoutAlign';

export class SchemaApplicationService implements SchemaUseCase {
  addTable(tables: Table[], viewOffset: { x: number; y: number }, canvasWidth: number, canvasHeight: number): Table[] {
    const centerX = -viewOffset.x + (canvasWidth / 2);
    const centerY = -viewOffset.y + (canvasHeight / 2);

    const newId = `table_${Date.now()}`;
    return [...tables, {
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
    }];
  }

  deleteTable(tableId: string, tables: Table[], relationships: Relationship[], valueObjects: ValueObjectPreset[]): { tables: Table[], relationships: Relationship[] } {
    const isReferencedInTable = tables.some(t => t.id !== tableId && t.columns.some(c => c.type === `FK:${tableId}`));
    const isReferencedInVO = valueObjects.some(vo => vo.properties.some(p => p.type === `FK:${tableId}`));
    if (isReferencedInTable || isReferencedInVO) {
        alert("このテーブルは、値オブジェクトまたは他のテーブルのデータ型(FK)として参照されているため削除できません。");
        return { tables, relationships };
    }

    const nextTables = tables.filter(t => t.id !== tableId);
    const remainingRels = relationships.filter(r => r.from !== tableId && r.to !== tableId);
    const syncedTables = syncTableColumnsWithRelationships(nextTables, remainingRels);

    return {
      tables: syncedTables,
      relationships: remainingRels
    };
  }

  updateTableName(tableId: string, name: string, tables: Table[]): Table[] {
    return tables.map(t => t.id === tableId ? { ...t, name } : t);
  }

  updateTableDescription(tableId: string, description: string, tables: Table[]): Table[] {
    return tables.map(t => t.id === tableId ? { ...t, description } : t);
  }

  updateTableOrderBy(tableId: string, orderBy: OrderBy, tables: Table[]): Table[] {
    return tables.map(t => t.id === tableId ? { ...t, orderBy } : t);
  }

  toggleTableMinimize(tableId: string, tables: Table[]): Table[] {
    return tables.map(t => t.id === tableId ? { ...t, isMinimized: !t.isMinimized } : t);
  }

  updateTableViewPane(tableId: string, viewPane: 'main' | 'sub', tables: Table[]): Table[] {
    return tables.map(t => t.id === tableId ? { ...t, viewPane } : t);
  }

  addColumn(tableId: string, tables: Table[]): Table[] {
    return tables.map(t => {
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
    });
  }

  deleteColumn(tableId: string, colId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const targetTable = tables.find(t => t.id === tableId);
    const colsToDelete = targetTable 
      ? [colId, ...targetTable.columns.filter(c => c.parentColumnId === colId).map(c => c.id)] 
      : [colId];

    const nextTables = tables.map(t => {
      if (t.id === tableId) {
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
    });

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

    const syncedTables = syncTableColumnsWithRelationships(nextTables, cleanedRels);
    return {
      tables: syncedTables,
      relationships: cleanedRels
    };
  }

  updateColumn(
    tableId: string, 
    colId: string, 
    field: keyof Column, 
    value: any, 
    tables: Table[], 
    relationships: Relationship[], 
    valueObjects: ValueObjectPreset[]
  ): { tables: Table[], relationships: Relationship[] } {
    let nextTables = tables.map(t => {
      if (t.id === tableId) {
        let updatedCols = t.columns.map(c => c.id === colId ? { ...c, [field]: value } : c);
        
        if (field === 'type') {
          const targetCol = updatedCols.find(c => c.id === colId);
          if (targetCol) {
            updatedCols = updatedCols.filter(c => c.parentColumnId !== colId);
            
            if (value.startsWith('FK:')) {
              updatedCols = updatedCols.map(c => c.id === colId ? {
                ...c,
                type: value,
                isFk: true
              } : c);
            } else {
              updatedCols = updatedCols.map(c => c.id === colId ? {
                ...c,
                type: value,
                isFk: false
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

        const parentColIds = new Set(
          updatedCols.filter(c => c.parentColumnId).map(c => c.parentColumnId)
        );

        updatedCols = updatedCols.map(c => {
          if (parentColIds.has(c.id)) {
            return {
              ...c,
              attributeType: 'independent',
              derivation: '',
              isFk: false
            };
          }
          return c;
        });

        return { ...t, columns: updatedCols };
      }
      return t;
    });

    let nextRels = relationships;
    if (field === 'type') {
      const cleanedRels = cleanRelationshipsForValueObjects(nextTables, relationships);
      
      if (value.startsWith('FK:')) {
        const refTableId = value.substring(3);
        const refTable = nextTables.find(t => t.id === refTableId);
        const refPkCol = refTable?.columns.find(c => c.isPk);
        const childTable = nextTables.find(t => t.columns.some(c => c.id === colId));
        
        if (refTable && refPkCol && childTable && refTable.id !== childTable.id) {
          const existingRel = cleanedRels.find(r => r.from === refTable.id && r.to === childTable.id);
          
          if (existingRel) {
            const hasMapping = existingRel.mappings?.some(m => m.childColId === colId);
            if (!hasMapping) {
              nextRels = cleanedRels.map(r => {
                if (r.id === existingRel.id) {
                  return {
                    ...r,
                    mappings: [...(r.mappings || []), { parentColId: refPkCol.id, childColId: colId }]
                  };
                }
                return r;
              });
            }
          } else {
            const childCol = childTable.columns.find(c => c.id === colId);
            const isPk = childCol?.isPk;
            const isUk = childTable.uniqueKeys?.some(uq => uq.columnIds?.includes(colId));
            const type = (isPk || isUk) ? 'identifying' : 'non_identifying';
            const newRelId = `rel_${refTable.id}_${childTable.id}_${colId}`;
            nextRels = [
              ...cleanedRels,
              {
                id: newRelId,
                from: refTable.id,
                to: childTable.id,
                type: type,
                mappings: [{ parentColId: refPkCol.id, childColId: colId }]
              }
            ];
          }
        }
      } else {
        // 型が 'FK:' 以外に変更された場合、このカラムに関するマッピングを relationships から削除する
        nextRels = cleanedRels.map(r => {
          if (r.mappings) {
            return {
              ...r,
              mappings: r.mappings.filter(m => m.childColId !== colId)
            };
          }
          return r;
        }).filter(r => r.mappings && r.mappings.length > 0);
      }
    }
    
    nextTables = syncTableColumnsWithRelationships(nextTables, nextRels);

    return {
      tables: nextTables,
      relationships: nextRels
    };
  }

  moveColumn(tableId: string, colId: string, direction: 'up' | 'down', tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        const index = t.columns.findIndex(c => c.id === colId);
        if (index === -1) return t;
        
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= t.columns.length) return t;
        
        const newColumns = [...t.columns];
        const temp = newColumns[index];
        newColumns[index] = newColumns[targetIndex];
        newColumns[targetIndex] = temp;
        
        return { ...t, columns: newColumns };
      }
      return t;
    });
  }



  addRow(tableId: string, tables: Table[]): Table[] {
    return tables.map(t => {
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
    });
  }

  deleteRow(tableId: string, rowId: string, tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        return { ...t, rows: t.rows.filter(r => r.id !== rowId) };
      }
      return t;
    });
  }

  updateRowValue(tableId: string, rowId: string, colId: string, value: any, tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          rows: t.rows.map(r => r.id === rowId ? { ...r, [colId]: value } : r)
        };
      }
      return t;
    });
  }

  addFkRelationship(childTableId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const newId = `rel_${Date.now()}`;
    const newRels = [...relationships, {
      id: newId,
      from: '', 
      to: childTableId,
      type: 'non_identifying' as const,
      mappings: []
    }];
    const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
    return {
      tables: syncedTables,
      relationships: newRels
    };
  }

  updateFkRelationshipParent(relId: string, parentTableId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const newRels = relationships.map(r => {
      if (r.id === relId) {
        return { ...r, from: parentTableId, mappings: [] };
      }
      return r;
    });
    const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
    return {
      tables: syncedTables,
      relationships: newRels
    };
  }

  toggleFkMapping(relId: string, childColId: string, isChecked: boolean, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const newRels = relationships.map(r => {
      if (r.id === relId) {
        let newMappings = r.mappings ? [...r.mappings] : [];
        if (isChecked) {
          if (!newMappings.some(m => m.childColId === childColId)) {
            newMappings.push({ parentColId: '', childColId: childColId });
          }
        } else {
          newMappings = newMappings.filter(m => m.childColId !== childColId);
        }
        return { ...r, mappings: newMappings };
      }
      return r;
    });
    const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
    return {
      tables: syncedTables,
      relationships: newRels
    };
  }

  updateFkMappingParentCol(relId: string, childColId: string, parentColId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
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
    const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
    return {
      tables: syncedTables,
      relationships: newRels
    };
  }

  connectTables(fromId: string, toId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const exists = relationships.some(
      r => (r.from === fromId && r.to === toId) || (r.from === toId && r.to === fromId)
    );
    if (!exists) {
      const newRels = [...relationships, {
        id: `rel_${Date.now()}`,
        from: fromId, 
        to: toId,           
        type: 'non_identifying' as const,
        mappings: []
      }];
      const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
      return {
        tables: syncedTables,
        relationships: newRels
      };
    }
    return { tables, relationships };
  }

  deleteRelationship(relId: string, tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const newRels = relationships.filter(r => r.id !== relId);
    const syncedTables = syncTableColumnsWithRelationships(tables, newRels);
    return {
      tables: syncedTables,
      relationships: newRels
    };
  }

  addUniqueKey(tableId: string, tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        return {
          ...t,
          uniqueKeys: [...uqs, { id: `uq_${Date.now()}`, columnIds: [] }]
        };
      }
      return t;
    });
  }

  deleteUniqueKey(tableId: string, uqId: string, tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        return {
          ...t,
          uniqueKeys: uqs.filter(uq => uq.id !== uqId)
        };
      }
      return t;
    });
  }

  toggleUniqueKeyMapping(tableId: string, uqId: string, colId: string, isChecked: boolean, tables: Table[]): Table[] {
    return tables.map(t => {
      if (t.id === tableId) {
        const uqs = t.uniqueKeys || [];
        const updatedUqs = uqs.map(uq => {
          if (uq.id === uqId) {
            let colIds = uq.columnIds ? [...uq.columnIds] : [];
            if (isChecked) {
              if (!colIds.includes(colId)) colIds.push(colId);
            } else {
              colIds = colIds.filter(id => id !== colId);
            }
            return { ...uq, columnIds: colIds };
          }
          return uq;
        });
        return { ...t, uniqueKeys: updatedUqs };
      }
      return t;
    });
  }

  updateValueObjects(newVOs: ValueObjectPreset[], tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const nextTables = tables.map(table => {
      const constraintBackup = new Map<string, Partial<Column>>();
      table.columns.forEach(c => {
        if (c.isVoProperty && c.parentColumnId && c.voPropertyName) {
          constraintBackup.set(`${c.parentColumnId}_${c.voPropertyName}`, {
            isPk: c.isPk,
            isUnique: c.isUnique,
            isFk: c.isFk,
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
          finalCols.push({
            ...col,
            attributeType: 'independent',
            derivation: '',
            isFk: false
          });

          voPreset.properties.forEach((prop: ValueObjectPropertyPreset) => {
            const backupKey = `${col.id}_${prop.name}`;
            const backup = constraintBackup.get(backupKey);

            let propType = prop.type;
            let isFk = backup?.isFk ?? false;

            if (prop.type.startsWith('FK:')) {
              const refTableId = prop.type.substring(3);
              const refTable = tables.find(t => t.id === refTableId);
              const refPkCol = refTable?.columns.find(c => c.isPk);
              if (refPkCol) {
                propType = refPkCol.type;
                isFk = true;
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
              voPropertyName: prop.name
            });
          });
        } else {
          finalCols.push(col);
        }
      });

      return { ...table, columns: finalCols };
    });

    const cleanedRels = cleanRelationshipsForValueObjects(nextTables, relationships);
    const nextRels = syncRelationshipsWithTables(nextTables, cleanedRels);
    const syncedTables = syncTableColumnsWithRelationships(nextTables, nextRels);

    return {
      tables: syncedTables,
      relationships: nextRels
    };
  }

  syncRelationships(tables: Table[], relationships: Relationship[]): { tables: Table[], relationships: Relationship[] } {
    const cleanedRels = cleanRelationshipsForValueObjects(tables, relationships);
    const nextRels = syncRelationshipsWithTables(tables, cleanedRels);
    const syncedTables = syncTableColumnsWithRelationships(tables, nextRels);
    return {
      tables: syncedTables,
      relationships: nextRels
    };
  }
}
