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
