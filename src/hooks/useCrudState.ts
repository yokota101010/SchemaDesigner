import { useState } from 'react';
import { INITIAL_CRUD_FUNCTIONS, INITIAL_CRUD_DATA } from '../constants';
import { CrudFunction, CrudData } from '../types';

export const useCrudState = (
  requestConfirmation: (title: string, message: string, onConfirm: () => void, isDanger?: boolean) => void
) => {
  const [crudFunctions, setCrudFunctions] = useState<CrudFunction[]>(INITIAL_CRUD_FUNCTIONS); 
  const [crudData, setCrudData] = useState<CrudData>(INITIAL_CRUD_DATA);

  const addCrudFunction = () => {
    const newId = `func_${Date.now()}`;
    setCrudFunctions([...crudFunctions, { id: newId, name: '新規機能' }]);
  };

  const updateCrudFunctionName = (id: string, name: string) => {
    setCrudFunctions(crudFunctions.map(f => f.id === id ? { ...f, name } : f));
  };

  const deleteCrudFunction = (id: string) => {
    requestConfirmation(
        "機能削除",
        "この機能を削除しますか？",
        () => {
            setCrudFunctions(crudFunctions.filter(f => f.id !== id));
            const newData = { ...crudData };
            delete newData[id];
            setCrudData(newData);
        },
        true
    );
  };

  const toggleCrudValue = (funcId: string, tableId: string, type: 'C' | 'R' | 'U' | 'D') => {
    const funcData = crudData[funcId] || {};
    const tableOps = funcData[tableId] || [];
    
    let newTableOps: string[];
    if (tableOps.includes(type)) {
        newTableOps = tableOps.filter(t => t !== type);
    } else {
        newTableOps = [...tableOps, type];
    }
    
    const sortOrder = ['C', 'R', 'U', 'D'];
    newTableOps.sort((a, b) => sortOrder.indexOf(a) - sortOrder.indexOf(b));

    setCrudData({
        ...crudData,
        [funcId]: {
            ...funcData,
            [tableId]: newTableOps
        }
    });
  };

  return {
    crudFunctions, setCrudFunctions,
    crudData, setCrudData,
    addCrudFunction,
    updateCrudFunctionName,
    deleteCrudFunction,
    toggleCrudValue
  };
};
