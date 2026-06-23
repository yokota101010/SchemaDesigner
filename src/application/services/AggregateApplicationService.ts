import { AggregateUseCase } from '../../ports/inbound/AggregateUseCase';
import { Table, Aggregate, AggregateData } from '../../domain/models';

export class AggregateApplicationService implements AggregateUseCase {
  addAggregate(aggregates: Aggregate[]): Aggregate[] {
    const newId = `agg_${Date.now()}`;
    return [...aggregates, { id: newId, name: '新規集約' }];
  }

  updateAggregateName(id: string, name: string, aggregates: Aggregate[]): Aggregate[] {
    return aggregates.map(a => a.id === id ? { ...a, name } : a);
  }

  deleteAggregate(
    id: string, 
    aggregates: Aggregate[], 
    aggregateData: AggregateData, 
    onConfirmed: (nextAggs: Aggregate[], nextData: AggregateData) => void,
    requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
  ): void {
    const agg = aggregates.find(a => a.id === id);
    const name = agg ? agg.name : 'この集約';

    requestConfirmation(
      "集約削除",
      `集約「${name}」を削除しますか？\n所属していたテーブルはすべて未所属に戻ります。`,
      () => {
        const nextAggs = aggregates.filter(a => a.id !== id);
        const nextData = { ...aggregateData };
        Object.keys(nextData).forEach(tableId => {
          if (nextData[tableId]?.aggregateId === id) {
            delete nextData[tableId];
          }
        });
        onConfirmed(nextAggs, nextData);
      },
      true
    );
  }

  assignTableToAggregate(
    tableId: string,
    targetAggregateId: string,
    role: 'R' | 'M',
    tables: Table[],
    aggregates: Aggregate[],
    aggregateData: AggregateData,
    onConfirmed: (nextData: AggregateData) => void,
    requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
  ): void {
    const table = tables.find(t => t.id === tableId);
    const tableName = table ? table.name : 'このテーブル';

    const performAssignment = (newRole: 'R' | 'M') => {
      const nextData = { ...aggregateData };
      
      if (newRole === 'R') {
        Object.keys(nextData).forEach(tId => {
          if (nextData[tId]?.aggregateId === targetAggregateId && nextData[tId]?.role === 'R' && tId !== tableId) {
            nextData[tId] = { ...nextData[tId], role: 'M' };
          }
        });
      }

      nextData[tableId] = { aggregateId: targetAggregateId, role: newRole };
      onConfirmed(nextData);
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
  }

  removeTableFromAggregate(tableId: string, aggregateData: AggregateData): AggregateData {
    const nextData = { ...aggregateData };
    delete nextData[tableId];
    return nextData;
  }

  alignTablesByAggregate(tables: Table[], aggregates: Aggregate[], aggregateData: AggregateData): string[] {
    const sortedIds: string[] = [];

    aggregates.forEach(agg => {
      const aggTables = tables.filter(t => aggregateData[t.id]?.aggregateId === agg.id);
      const rootTables = aggTables.filter(t => aggregateData[t.id]?.role === 'R');
      const memberTables = aggTables.filter(t => aggregateData[t.id]?.role === 'M');

      rootTables.sort((a, b) => a.name.localeCompare(b.name));
      memberTables.sort((a, b) => a.name.localeCompare(b.name));

      rootTables.forEach(t => sortedIds.push(t.id));
      memberTables.forEach(t => sortedIds.push(t.id));
    });

    const unassignedTables = tables.filter(t => !aggregateData[t.id]);
    unassignedTables.sort((a, b) => a.name.localeCompare(b.name));
    unassignedTables.forEach(t => sortedIds.push(t.id));

    return sortedIds;
  }
}
