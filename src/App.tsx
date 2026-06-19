import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_PROJECT_NAME, INITIAL_TABLES, INITIAL_RELATIONSHIPS, INITIAL_CRUD_FUNCTIONS, INITIAL_CRUD_DATA } from './constants';

import { useSchemaState } from './hooks/useSchemaState';
import { useCrudState } from './hooks/useCrudState';
import { useDragAndDrop } from './hooks/useDragAndDrop';

import { generateSQL as generateSQLUtil } from './utils/sqlGenerator';

import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { HelpModal } from './components/modals/HelpModal';
import { SqlModal } from './components/modals/SqlModal';
import { PromptModal } from './components/modals/PromptModal';
import { CrudModal } from './components/modals/CrudModal';
import { TableEditorModal } from './components/modals/TableEditorModal';
import { AiSettingsModal } from './components/modals/AiSettingsModal';
import { AiLoadingModal } from './components/modals/AiLoadingModal';
import { AiGeneratePromptModal } from './components/modals/AiGeneratePromptModal';
import { generateMockDataWithAI } from './utils/aiDataGenerator';

import { Table, Relationship } from './types';

function SchemaDesigner() {
  const [projectName, setProjectName] = useState<string>(DEFAULT_PROJECT_NAME);
  const [aiInstructions, setAiInstructions] = useState<string>("");

  const [showAiSettingsModal, setShowAiSettingsModal] = useState<boolean>(false);
  const [showAiLoadingModal, setShowAiLoadingModal] = useState<boolean>(false);
  const [showAiGeneratePromptModal, setShowAiGeneratePromptModal] = useState<boolean>(false);
  const [aiInitialInstructions, setAiInitialInstructions] = useState<string>(() => {
      return localStorage.getItem('schema-designer-ai-initial-instructions') || '';
  });
  const [aiOtherInstructions, setAiOtherInstructions] = useState<string>(() => {
      return localStorage.getItem('schema-designer-ai-other-instructions') || '';
  });
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false); 
  const [showCrudModal, setShowCrudModal] = useState<boolean>(false); 
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [generatedSql, setGeneratedSql] = useState<string>('');

  const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmation, setConfirmation] = useState<any>(null);
  
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const requestConfirmation = useCallback((title: string, message: string, onConfirm: () => void, isDanger = false) => {
      setConfirmation({ title, message, onConfirm, isDanger });
  }, []);

  const handleConfirmAction = () => {
      if (confirmation && confirmation.onConfirm) {
          confirmation.onConfirm();
      }
      setConfirmation(null);
  };

  const schemaState = useSchemaState(viewOffset, requestConfirmation);
  const {
      tables, setTables, relationships, setRelationships,
      editingTableId, setEditingTableId, connectionMode, setConnectionMode,
      selectedRelId, setSelectedRelId, autoUpdateRelationshipType,
      addTable, deleteTable, initiateDeleteTable, updateTableName, updateTableOrderBy,
      toggleTableMinimize, addColumn, deleteColumn, updateColumn,
      updateColumnReference, moveColumn, addRow, deleteRow, updateRowValue,
      startConnectionMode, handleConnect, deleteRelationship,
      addFkRelationship, updateFkRelationshipParent, toggleFkMapping, updateFkMappingParentCol,
      addUniqueKey, deleteUniqueKey, toggleUniqueKeyMapping
  } = schemaState;

  const [backupTables, setBackupTables] = useState<Table[] | null>(null);
  const [backupRelationships, setBackupRelationships] = useState<Relationship[] | null>(null);

  useEffect(() => {
      if (editingTableId) {
          setBackupTables(JSON.parse(JSON.stringify(tables)));
          setBackupRelationships(JSON.parse(JSON.stringify(relationships)));
      } else {
          setBackupTables(null);
          setBackupRelationships(null);
      }
  }, [editingTableId]);

  const handleCancelEdit = () => {
      if (backupTables && backupRelationships) {
          setTables(backupTables);
          setRelationships(backupRelationships);
      }
      setEditingTableId(null);
  };

  const handleCompleteEdit = () => {
      autoUpdateRelationshipType(tables);
      setEditingTableId(null);
  };

  const crudState = useCrudState(requestConfirmation);
  const {
      crudFunctions, setCrudFunctions, crudData, setCrudData,
      addCrudFunction, updateCrudFunctionName, deleteCrudFunction, toggleCrudValue
  } = crudState;

  const dragState = useDragAndDrop(
      tables, setTables, relationships, 
      viewOffset, setViewOffset
  );

  const loadDemoData = useCallback(() => {
      setTables(INITIAL_TABLES);
      setRelationships(INITIAL_RELATIONSHIPS);
      setCrudFunctions(INITIAL_CRUD_FUNCTIONS);
      setCrudData(INITIAL_CRUD_DATA);
      setAiInstructions("");
      setProjectName(DEFAULT_PROJECT_NAME);
  }, [setTables, setRelationships, setCrudFunctions, setCrudData]);

  useEffect(() => {
    try {
        const data = localStorage.getItem('schema-designer-autosave-v1');
        if (data) {
            const parsed = JSON.parse(data);
            setProjectName(parsed.name || DEFAULT_PROJECT_NAME);
            
            const cleanedTables = (parsed.tables || []).map((t: any) => ({
                ...t,
                rows: Array.isArray(t.rows) ? t.rows : []
            }));
            setTables(cleanedTables);
            
            setRelationships(parsed.relationships || []);
            setCrudFunctions(parsed.crudFunctions || []);
            setCrudData(parsed.crudData || {});
            setAiInstructions(parsed.aiInstructions || "");
            setViewOffset({ x: 0, y: 0 });
        } else {
            loadDemoData();
        }
    } catch (e) {
        console.error("Error loading auto-save", e);
        loadDemoData();
    }
    setIsLoading(false);
  }, [loadDemoData, setTables, setRelationships, setCrudFunctions, setCrudData]);

  useEffect(() => {
      if (isLoading) return;
      
      const cleanedTables = tables.map(t => ({
        ...t,
        rows: Array.isArray(t.rows) ? t.rows : []
      }));

      const saveData = {
        name: projectName,
        tables: cleanedTables,
        relationships,
        crudFunctions,
        crudData,
        aiInstructions,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('schema-designer-autosave-v1', JSON.stringify(saveData));
  }, [projectName, tables, relationships, crudFunctions, crudData, aiInstructions, isLoading]);

  const handleAiGenerateData = () => {
      const apiKey = localStorage.getItem('schema-designer-gemini-apikey');
      if (!apiKey) {
          setShowAiSettingsModal(true);
          alert("Gemini APIキーが設定されていません。まずは設定ボタン（🔑マーク）からキーを保存してください。");
          return;
      }
      setShowAiGeneratePromptModal(true);
  };

  const handleExecuteAiGenerateData = async () => {
      setShowAiGeneratePromptModal(false);

      const apiKey = localStorage.getItem('schema-designer-gemini-apikey');
      if (!apiKey) return;

      localStorage.setItem('schema-designer-ai-initial-instructions', aiInitialInstructions);
      localStorage.setItem('schema-designer-ai-other-instructions', aiOtherInstructions);

      setShowAiLoadingModal(true);
      try {
          const generatedData = await generateMockDataWithAI(tables, relationships, apiKey, 3, aiInitialInstructions, aiOtherInstructions);
          
          setTables(prevTables => {
              return prevTables.map(table => {
                  const newRows = generatedData[table.id];
                  if (newRows && Array.isArray(newRows)) {
                      const formattedRows = newRows.map((row, idx) => ({
                          id: `row_ai_${Date.now()}_${idx}`,
                          ...row
                      }));
                      return { 
                          ...table, 
                          rows: formattedRows,
                          isMinimized: false
                      };
                  }
                  return table;
              });
          });

          alert("AIによるサンプルデータの生成が完了しました！");
      } catch (error: any) {
          console.error("AI Generation Error:", error);
          alert(`エラーが発生しました: ${error.message}`);
      } finally {
          setShowAiLoadingModal(false);
      }
  };

  const handleNewProject = () => {
      requestConfirmation(
          "新規プロジェクト作成",
          "現在の状態をリセットし、新しいプロジェクトを作成しますか？",
          () => {
            setProjectName(DEFAULT_PROJECT_NAME);
            setTables(INITIAL_TABLES);
            setRelationships(INITIAL_RELATIONSHIPS);
            setCrudFunctions([]);
            setCrudData({});
            setAiInstructions("");
            setViewOffset({ x: 0, y: 0 });
          },
          true
      );
  };

  const handleExportJSON = async () => {
    const defaultName = `${projectName.replace(/\s+/g, '_')}_schema.json`;

    const cleanedTables = tables.map(t => ({
      ...t,
      rows: Array.isArray(t.rows) ? t.rows : []
    }));

    const projectData = {
      name: projectName,
      tables: cleanedTables,
      relationships,
      crudFunctions,
      crudData,
      aiInstructions,
      version: "1.3", 
      exportedAt: new Date().toISOString()
    };
    const jsonString = JSON.stringify(projectData, null, 2);

    try {
        if ((window as any).showSaveFilePicker) {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: defaultName,
                types: [{
                    description: 'JSON File',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(jsonString);
            await writable.close();
        } else {
            const fileName = window.prompt("保存するファイル名を入力してください", defaultName);
            if (!fileName) return;

            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error("Error saving file:", error);
            alert("ファイルの保存に失敗しました。");
        }
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; 
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        const json = JSON.parse(event.target.result);
        
        if (!Array.isArray(json.tables) || !Array.isArray(json.relationships)) {
          alert('無効なファイル形式です。');
          return;
        }

        requestConfirmation(
            "ファイル読み込み",
            `ファイル "${file.name}" を読み込みますか？\n現在の作業内容は上書きされます。`,
            () => {
                setProjectName(json.name || "Imported Project");
                
                const cleanedTables = (json.tables || []).map((t: any) => ({
                    ...t,
                    rows: Array.isArray(t.rows) ? t.rows : []
                }));
                setTables(cleanedTables);

                setRelationships(json.relationships);
                setCrudFunctions(json.crudFunctions || []);
                setCrudData(json.crudData || {});
                setAiInstructions(json.aiInstructions || "");
                setViewOffset({ x: 0, y: 0 });
            },
            true
        );
      } catch (err) {
        console.error("Import error:", err);
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleExportJSON();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tables, relationships, projectName, crudFunctions, crudData, aiInstructions]);

  useEffect(() => {
    const onDragMove = (e: any) => dragState.handleDragMove(e, canvasRef);
    if (dragState.draggingId || dragState.isPanning) {
      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('mouseup', dragState.handleDragEnd);
      window.addEventListener('touchmove', onDragMove, { passive: false });
      window.addEventListener('touchend', dragState.handleDragEnd);
    } else {
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', dragState.handleDragEnd);
      window.removeEventListener('touchmove', onDragMove);
      window.removeEventListener('touchend', dragState.handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onDragMove);
      window.removeEventListener('mouseup', dragState.handleDragEnd);
      window.removeEventListener('touchmove', onDragMove);
      window.removeEventListener('touchend', dragState.handleDragEnd);
    };
  }, [dragState.draggingId, dragState.isPanning, dragState.handleDragMove, dragState.handleDragEnd]);

  const generateSQL = () => {
      const sql = generateSQLUtil(tables, relationships);
      setGeneratedSql(sql);
      setShowSqlModal(true);
  };

  const editingTable = tables.find(t => t.id === editingTableId) || null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans overflow-hidden text-xs">
      <Header 
        projectName={projectName} setProjectName={setProjectName}
        handleNewProject={handleNewProject} handleImportClick={handleImportClick}
        handleExportJSON={handleExportJSON} fileInputRef={fileInputRef} handleFileChange={handleFileChange}
        setShowPromptModal={setShowPromptModal} setShowCrudModal={setShowCrudModal}
        addTable={() => addTable(canvasRef)} generateSQL={generateSQL} setShowHelpModal={setShowHelpModal}
        onAiGenerateData={handleAiGenerateData} onOpenAiSettings={() => setShowAiSettingsModal(true)}
      />
      
      <Canvas 
        canvasRef={canvasRef}
        handleDragStart={(e, id) => dragState.handleDragStart(e, id, canvasRef, setSelectedRelId)}
        isPanning={dragState.isPanning}
        viewOffset={viewOffset}
        isLoading={isLoading}
        relationships={relationships}
        tables={tables}
        connectionMode={connectionMode}
        setConnectionMode={setConnectionMode}
        addRow={addRow}
        setEditingTableId={setEditingTableId}
        initiateDeleteTable={initiateDeleteTable}
        toggleTableMinimize={toggleTableMinimize}
        updateRowValue={updateRowValue}
        deleteRow={deleteRow}
      />

      <PromptModal showPromptModal={showPromptModal} setShowPromptModal={setShowPromptModal} aiInstructions={aiInstructions} setAiInstructions={setAiInstructions} />
      
      <CrudModal 
        showCrudModal={showCrudModal} setShowCrudModal={setShowCrudModal} 
        tables={tables} crudFunctions={crudFunctions} crudData={crudData} 
        addCrudFunction={addCrudFunction} updateCrudFunctionName={updateCrudFunctionName} 
        deleteCrudFunction={deleteCrudFunction} toggleCrudValue={toggleCrudValue} 
      />
      
      <SqlModal showSqlModal={showSqlModal} setShowSqlModal={setShowSqlModal} generatedSql={generatedSql} />
      
      <HelpModal showHelpModal={showHelpModal} setShowHelpModal={setShowHelpModal} />
      
      <TableEditorModal 
        editingTable={editingTable} tables={tables} 
        initiateDeleteTable={initiateDeleteTable} updateTableName={updateTableName} 
        updateTableOrderBy={updateTableOrderBy}
        addColumn={addColumn} updateColumn={updateColumn} 
        deleteColumn={deleteColumn} moveColumn={moveColumn}
        relationships={relationships} deleteRelationship={deleteRelationship}
        addFkRelationship={addFkRelationship} updateFkRelationshipParent={updateFkRelationshipParent}
        toggleFkMapping={toggleFkMapping} updateFkMappingParentCol={updateFkMappingParentCol}
        addUniqueKey={addUniqueKey} deleteUniqueKey={deleteUniqueKey} toggleUniqueKeyMapping={toggleUniqueKeyMapping}
        onComplete={handleCompleteEdit}
        onCancel={handleCancelEdit}
      />
      
      <AiSettingsModal showModal={showAiSettingsModal} setShowModal={setShowAiSettingsModal} />
      <AiLoadingModal showModal={showAiLoadingModal} />
      <AiGeneratePromptModal 
        showModal={showAiGeneratePromptModal} 
        setShowModal={setShowAiGeneratePromptModal} 
        initialPromptText={aiInitialInstructions} 
        setInitialPromptText={setAiInitialInstructions} 
        otherPromptText={aiOtherInstructions} 
        setOtherPromptText={setAiOtherInstructions} 
        onGenerate={handleExecuteAiGenerateData} 
      />
      
      <ConfirmModal confirmation={confirmation} setConfirmation={setConfirmation} handleConfirmAction={handleConfirmAction} />
    </div>
  );
}

export default SchemaDesigner;
