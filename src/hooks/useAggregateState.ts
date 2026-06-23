import { useState, useCallback } from 'react';
import { Aggregate, AggregateData, Table } from '../domain/models';
import { INITIAL_AGGREGATES, INITIAL_AGGREGATE_DATA, INITIAL_AGGREGATE_TABLE_ORDER } from '../constants';
import { AggregateUseCase } from '../ports/inbound/AggregateUseCase';

export const useAggregateState = (
  requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void,
  aggregateUseCase: AggregateUseCase
) => {
  const [aggregates, setAggregates] = useState<Aggregate[]>(INITIAL_AGGREGATES);
  const [aggregateData, setAggregateData] = useState<AggregateData>(INITIAL_AGGREGATE_DATA);
  const [aggregateTableOrder, setAggregateTableOrder] = useState<string[]>(INITIAL_AGGREGATE_TABLE_ORDER);

  const addAggregate = useCallback(() => {
    const nextAggs = aggregateUseCase.addAggregate(aggregates);
    setAggregates(nextAggs);
  }, [aggregates, aggregateUseCase]);

  const updateAggregateName = useCallback((id: string, name: string) => {
    const nextAggs = aggregateUseCase.updateAggregateName(id, name, aggregates);
    setAggregates(nextAggs);
  }, [aggregates, aggregateUseCase]);

  const deleteAggregate = useCallback((id: string) => {
    aggregateUseCase.deleteAggregate(
      id, 
      aggregates, 
      aggregateData,
      (nextAggs, nextData) => {
        setAggregates(nextAggs);
        setAggregateData(nextData);
      },
      requestConfirmation
    );
  }, [aggregates, aggregateData, requestConfirmation, aggregateUseCase]);

  const assignTableToAggregate = useCallback((
    tableId: string,
    targetAggregateId: string,
    role: 'R' | 'M',
    tables: Table[]
  ) => {
    aggregateUseCase.assignTableToAggregate(
      tableId,
      targetAggregateId,
      role,
      tables,
      aggregates,
      aggregateData,
      (nextData) => {
        setAggregateData(nextData);
      },
      requestConfirmation
    );
  }, [aggregates, aggregateData, requestConfirmation, aggregateUseCase]);

  const removeTableFromAggregate = useCallback((tableId: string) => {
    const nextData = aggregateUseCase.removeTableFromAggregate(tableId, aggregateData);
    setAggregateData(nextData);
  }, [aggregateData, aggregateUseCase]);

  const alignTablesByAggregate = useCallback((tables: Table[]) => {
    const nextOrder = aggregateUseCase.alignTablesByAggregate(tables, aggregates, aggregateData);
    setAggregateTableOrder(nextOrder);
  }, [aggregates, aggregateData, aggregateUseCase]);

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
