import { Column } from '../domain/models';

/**
 * 初期行（existingRows）とAI生成行（generatedRows）をPKに基づいてマージする
 */
export const mergeMockRows = (
  existingRows: any[],
  generatedRows: any[],
  pkCols: Column[]
): any[] => {
  const finalRows = existingRows.map(exRow => ({ ...exRow }));
  generatedRows.forEach((newRow: any) => {
    let duplicateIdx = -1;
    if (pkCols.length > 0) {
      duplicateIdx = finalRows.findIndex(exRow => {
        return pkCols.every(pkCol => {
          return exRow[pkCol.id] !== undefined && newRow[pkCol.id] !== undefined && String(exRow[pkCol.id]) === String(newRow[pkCol.id]);
        });
      });
    }

    if (duplicateIdx !== -1) {
      // 重複がある場合は、既存行のデータをベースにしつつ、AIが生成した新しい行のデータ（更新されたフラグや値）で上書きマージします。
      finalRows[duplicateIdx] = {
        ...finalRows[duplicateIdx],
        ...newRow
      };
    } else {
      finalRows.push({
        id: `row_ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        ...newRow
      });
    }
  });
  return finalRows;
};

/**
 * 子テーブルに存在する外部キー値（単一・複合・複合PK内FK含む）に対応する親レコードが親テーブルに欠落している場合、
 * プログラム側で自律的に親レコードを補填生成して100%参照整合性を保証します。
 */
export const ensureReferentialIntegrity = (
  tables: Table[],
  relationships: Relationship[],
  allGeneratedData: Record<string, any[]>
): Record<string, any[]> => {
  const updatedData: Record<string, any[]> = { ...allGeneratedData };

  relationships.forEach(rel => {
    const parentTable = tables.find(t => t.id === rel.from);
    const childTable = tables.find(t => t.id === rel.to);
    if (!parentTable || !childTable || !rel.mappings || rel.mappings.length === 0) return;

    const childRows = updatedData[childTable.id] || [];
    const parentRows = updatedData[parentTable.id] || [];

    childRows.forEach(childRow => {
      // 子行が有効なFK値を持っているかチェック
      const childFkValues: Record<string, any> = {};
      let hasCompleteFk = true;

      rel.mappings.forEach(m => {
        const val = childRow[m.childColId];
        if (val === undefined || val === null || val === '') {
          hasCompleteFk = false;
        } else {
          childFkValues[m.parentColId] = val;
        }
      });

      if (!hasCompleteFk) return;

      // 親テーブルに一致する主キー行が存在するか確認
      const parentRowExists = parentRows.some(pRow => {
        return rel.mappings.every(m => {
          const parentVal = pRow[m.parentColId];
          const childVal = childRow[m.childColId];
          return parentVal !== undefined && parentVal !== null && String(parentVal) === String(childVal);
        });
      });

      // 親行が存在しない場合、親テーブルにレスキュー親行を自動生成・補填挿入！
      if (!parentRowExists) {
        console.log(`[RDB Referential Rescue] 親テーブル '${parentTable.name}' に不足しているキーをプログラムで自動補填します:`, childFkValues);

        const newParentRow: Record<string, any> = {
          id: `row_ai_rescued_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        };

        parentTable.columns.forEach(col => {
          if (childFkValues[col.id] !== undefined) {
            newParentRow[col.id] = childFkValues[col.id];
          } else if (col.attributeType === 'dependent') {
            newParentRow[col.id] = null;
          } else {
            // 他の非導出カラムの初期値推測
            if (col.type === 'DATE') {
              newParentRow[col.id] = '2026-04-01';
            } else if (col.type === 'INT' || col.type === 'DECIMAL' || col.type === 'FLOAT') {
              newParentRow[col.id] = 0;
            } else {
              newParentRow[col.id] = col.name;
            }
          }
        });

        parentRows.push(newParentRow);
      }
    });

    updatedData[parentTable.id] = parentRows;
  });

  return updatedData;
};

