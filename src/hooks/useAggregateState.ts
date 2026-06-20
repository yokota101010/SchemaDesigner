import { useState, useCallback } from 'react';
import { Aggregate, AggregateData, Table } from '../types';
import { INITIAL_AGGREGATES, INITIAL_AGGREGATE_DATA, INITIAL_AGGREGATE_TABLE_ORDER } from '../constants';

export const useAggregateState = (
  requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
) => {
  const [aggregates, setAggregates] = useState<Aggregate[]>(INITIAL_AGGREGATES);
  const [aggregateData, setAggregateData] = useState<AggregateData>(INITIAL_AGGREGATE_DATA);
  const [aggregateTableOrder, setAggregateTableOrder] = useState<string[]>(INITIAL_AGGREGATE_TABLE_ORDER);

  const addAggregate = useCallback(() => {
    const newId = `agg_${Date.now()}`;
    setAggregates(prev => [...prev, { id: newId, name: '新規集約' }]);
  }, []);

  const updateAggregateName = useCallback((id: string, name: string) => {
    setAggregates(prev => prev.map(a => a.id === id ? { ...a, name } : a));
  }, []);

  const deleteAggregate = useCallback((id: string) => {
    const agg = aggregates.find(a => a.id === id);
    const name = agg ? agg.name : 'この集約';
    requestConfirmation(
      "集約削除",
      `集約「${name}」を削除しますか？\n所属していたテーブルはすべて未所属に戻ります。`,
      () => {
        setAggregates(prev => prev.filter(a => a.id !== id));
        // 所属テーブルのクリーンアップ
        setAggregateData(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(tableId => {
            if (next[tableId]?.aggregateId === id) {
              delete next[tableId];
            }
          });
          return next;
        });
      },
      true
    );
  }, [aggregates, requestConfirmation]);

  // テーブルを集約に割り当て（変更時）
  const assignTableToAggregate = useCallback((
    tableId: string,
    targetAggregateId: string,
    role: 'R' | 'M',
    tables: Table[]
  ) => {
    const table = tables.find(t => t.id === tableId);
    const tableName = table ? table.name : 'このテーブル';

    const performAssignment = (newRole: 'R' | 'M') => {
      setAggregateData(prev => {
        const next = { ...prev };
        
        // もし Root (R) に設定しようとしており、すでにその集約内に別の Root がある場合は調整する
        if (newRole === 'R') {
          Object.keys(next).forEach(tId => {
            if (next[tId]?.aggregateId === targetAggregateId && next[tId]?.role === 'R' && tId !== tableId) {
              next[tId] = { ...next[tId], role: 'M' };
            }
          });
        }

        next[tableId] = { aggregateId: targetAggregateId, role: newRole };
        return next;
      });
    };

    const checkRootConflictAndAssign = (newRole: 'R' | 'M') => {
      if (newRole === 'R') {
        const existingRootTableId = Object.keys(aggregateData).find(
          tId => aggregateData[tId]?.aggregateId === targetAggregateId && aggregateData[tId]?.role === 'R' && tId !== tableId
        );

        if (existingRootTableId) {
          const existingRootTable = tables.find(t => t.id === existingRootTableId);
          const existingRootName = existingRootTable ? existingRootTable.name : '既存テーブル';
          const targetAgg = aggregates.find(a => a.id === targetAggregateId);
          const aggName = targetAgg ? targetAgg.name : '対象集約';

          requestConfirmation(
            "集約ルートの重複検知",
            `集約「${aggName}」には既にルート（${existingRootName}）が存在します。\n「${tableName}」を新しいルートに変更し、${existingRootName} をメンバー（M）に変更しますか？`,
            () => {
              performAssignment('R');
            }
          );
          return;
        }
      }
      performAssignment(newRole);
    };

    const currentAssignment = aggregateData[tableId];
    if (currentAssignment && currentAssignment.aggregateId !== targetAggregateId) {
      const prevAgg = aggregates.find(a => a.id === currentAssignment.aggregateId);
      const prevAggName = prevAgg ? prevAgg.name : '別の集約';
      const targetAgg = aggregates.find(a => a.id === targetAggregateId);
      const targetAggName = targetAgg ? targetAgg.name : '新しい集約';

      requestConfirmation(
        "所属集約の変更確認",
        `テーブル「${tableName}」は既に集約「${prevAggName}」に属しています。\n集約「${targetAggName}」へ変更しますか？`,
        () => {
          checkRootConflictAndAssign(role);
        }
      );
    } else {
      checkRootConflictAndAssign(role);
    }
  }, [aggregateData, aggregates, requestConfirmation]);

  const removeTableFromAggregate = useCallback((tableId: string) => {
    setAggregateData(prev => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  }, []);

  const alignTablesByAggregate = useCallback((tables: Table[]) => {
    const sortedIds: string[] = [];

    // 集約ごとにテーブルを収集
    aggregates.forEach(agg => {
      const aggTables = tables.filter(t => aggregateData[t.id]?.aggregateId === agg.id);
      
      const rootTables = aggTables.filter(t => aggregateData[t.id]?.role === 'R');
      const memberTables = aggTables.filter(t => aggregateData[t.id]?.role === 'M');

      // 名前でソート
      rootTables.sort((a, b) => a.name.localeCompare(b.name));
      memberTables.sort((a, b) => a.name.localeCompare(b.name));

      rootTables.forEach(t => sortedIds.push(t.id));
      memberTables.forEach(t => sortedIds.push(t.id));
    });

    // 未所属のテーブルを収集
    const unassignedTables = tables.filter(t => !aggregateData[t.id]);
    unassignedTables.sort((a, b) => a.name.localeCompare(b.name));
    unassignedTables.forEach(t => sortedIds.push(t.id));

    setAggregateTableOrder(sortedIds);
  }, [aggregates, aggregateData]);

  const moveTableOrder = useCallback((dragIndex: number, hoverIndex: number) => {
    setAggregateTableOrder(prev => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next;
    });
  }, []);

  return {
    aggregates,
    setAggregates,
    aggregateData,
    setAggregateData,
    aggregateTableOrder,
    setAggregateTableOrder,
    addAggregate,
    updateAggregateName,
    deleteAggregate,
    assignTableToAggregate,
    removeTableFromAggregate,
    alignTablesByAggregate,
    moveTableOrder
  };
};
