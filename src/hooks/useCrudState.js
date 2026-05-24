import { useState } from 'react';
import { INITIAL_CRUD_FUNCTIONS, INITIAL_CRUD_DATA } from '../constants';

export const useCrudState = (requestConfirmation) => {
  const [crudFunctions, setCrudFunctions] = useState(INITIAL_CRUD_FUNCTIONS); 
  const [crudData, setCrudData] = useState(INITIAL_CRUD_DATA);

  const addCrudFunction = () => {
    const newId = `func_${Date.now()}`;
    setCrudFunctions([...crudFunctions, { id: newId, name: '新規機能' }]);
  };

  const updateCrudFunctionName = (id, name) => {
    setCrudFunctions(crudFunctions.map(f => f.id === id ? { ...f, name } : f));
  };

  const deleteCrudFunction = (id) => {
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

  const toggleCrudValue = (funcId, tableId, type) => {
    const funcData = crudData[funcId] || {};
    const tableOps = funcData[tableId] || [];
    
    let newTableOps;
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
