import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DEFAULT_PROJECT_NAME, INITIAL_TABLES, INITIAL_RELATIONSHIPS, INITIAL_VALUE_OBJECTS, INITIAL_AGGREGATES, INITIAL_AGGREGATE_DATA, INITIAL_AGGREGATE_TABLE_ORDER } from '../../../constants';

import { useSchemaState } from '../../../hooks/useSchemaState';
import { useAggregateState } from '../../../hooks/useAggregateState';
import { useDragAndDrop } from './hooks/useDragAndDrop';

import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { ConfirmModal } from './components/modals/ConfirmModal';
import { AggregateModal } from './components/modals/AggregateModal';
import { TableEditorModal } from './components/modals/TableEditorModal';
import { AiSettingsModal } from './components/modals/AiSettingsModal';
import { AiLoadingModal } from './components/modals/AiLoadingModal';
import { AiGeneratePromptModal } from './components/modals/AiGeneratePromptModal';
import { ValueObjectSettingsModal } from './components/modals/ValueObjectSettingsModal';

import { Table, Relationship } from '../../../domain/models';
import { generateMarkdown } from '../../../utils/markdownGenerator';

import { ProjectRepository } from '../../../ports/outbound/ProjectRepository';
import { FileExporter } from '../../../ports/outbound/FileExporter';
import { AiClient } from '../../../ports/outbound/AiClient';
import { SchemaUseCase } from '../../../ports/inbound/SchemaUseCase';
import { AggregateUseCase } from '../../../ports/inbound/AggregateUseCase';

import { LocalStorageProjectRepository } from '../../outbound/LocalStorageProjectRepository';
import { BrowserFileExporter } from '../../outbound/BrowserFileExporter';
import { GeminiAiClient } from '../../outbound/GeminiAiClient';
import { SchemaApplicationService } from '../../../application/services/SchemaApplicationService';
import { AggregateApplicationService } from '../../../application/services/AggregateApplicationService';

const projectRepository: ProjectRepository = new LocalStorageProjectRepository();
const fileExporter: FileExporter = new BrowserFileExporter();
const aiClient: AiClient = new GeminiAiClient();
const schemaUseCase: SchemaUseCase = new SchemaApplicationService();
const aggregateUseCase: AggregateUseCase = new AggregateApplicationService();

function SchemaDesigner() {
  const [projectName, setProjectName] = useState<string>(DEFAULT_PROJECT_NAME);

  const [showAiSettingsModal, setShowAiSettingsModal] = useState<boolean>(false);
  const [showValueObjectSettingsModal, setShowValueObjectSettingsModal] = useState<boolean>(false);
  const [showAiLoadingModal, setShowAiLoadingModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'main' | 'sub'>('main');
  const [showAiGeneratePromptModal, setShowAiGeneratePromptModal] = useState<boolean>(false);
  const [aiInitialInstructions, setAiInitialInstructions] = useState<string>(() => {
      return localStorage.getItem('schema-designer-ai-initial-instructions') || '';
  });
  const [aiOtherInstructions, setAiOtherInstructions] = useState<string>(() => {
      return localStorage.getItem('schema-designer-ai-other-instructions') || '';
  });
  const [showAggregateModal, setShowAggregateModal] = useState<boolean>(false); 
  const [backupAggregates, setBackupAggregates] = useState<any[] | null>(null);
  const [backupAggregateData, setBackupAggregateData] = useState<any | null>(null);
  const [backupAggregateTableOrder, setBackupAggregateTableOrder] = useState<string[] | null>(null);
  const [mainViewOffset, setMainViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [subViewOffset, setSubViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const viewOffset = activeTab === 'main' ? mainViewOffset : subViewOffset;
  const setViewOffset = activeTab === 'main' ? setMainViewOffset : setSubViewOffset;
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

  const schemaState = useSchemaState(viewOffset, requestConfirmation, schemaUseCase);
  const {
      tables, setTables, relationships, setRelationships,
      valueObjects, setValueObjects, updateValueObjects,
      editingTableId, setEditingTableId, connectionMode, setConnectionMode,
      selectedRelId, setSelectedRelId, autoUpdateRelationshipType,
      addTable, deleteTable, initiateDeleteTable, updateTableName, updateTableOrderBy,
      toggleTableMinimize, updateTableViewPane, alignSubTables, addColumn, deleteColumn, updateColumn,
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

  const aggregateState = useAggregateState(requestConfirmation, aggregateUseCase);
  const {
      aggregates, setAggregates, aggregateData, setAggregateData,
      aggregateTableOrder, setAggregateTableOrder,
      addAggregate, updateAggregateName, deleteAggregate,
      assignTableToAggregate, removeTableFromAggregate,
      alignTablesByAggregate, moveTableOrder
  } = aggregateState;

  const handleOpenAggregateModal = () => {
      setBackupAggregates(JSON.parse(JSON.stringify(aggregates)));
      setBackupAggregateData(JSON.parse(JSON.stringify(aggregateData)));
      setBackupAggregateTableOrder(JSON.parse(JSON.stringify(aggregateTableOrder)));
      setShowAggregateModal(true);
  };

  const handleCancelAggregateEdit = () => {
      if (backupAggregates && backupAggregateData && backupAggregateTableOrder) {
          setAggregates(backupAggregates);
          setAggregateData(backupAggregateData);
          setAggregateTableOrder(backupAggregateTableOrder);
      }
      setShowAggregateModal(false);
  };

  const dragState = useDragAndDrop(
      tables, setTables, relationships, 
      viewOffset, setViewOffset
  );

  const loadDemoData = useCallback(() => {
      setTables(INITIAL_TABLES);
      setRelationships(INITIAL_RELATIONSHIPS);
      setValueObjects(INITIAL_VALUE_OBJECTS);
      setAggregates(INITIAL_AGGREGATES);
      setAggregateData(INITIAL_AGGREGATE_DATA);
      setAggregateTableOrder(INITIAL_AGGREGATE_TABLE_ORDER);
      setProjectName(DEFAULT_PROJECT_NAME);
  }, [setTables, setRelationships, setValueObjects, setAggregates, setAggregateData, setAggregateTableOrder]);

  useEffect(() => {
    const loadData = async () => {
      try {
          const parsed = await projectRepository.load();
          if (parsed) {
              setProjectName(parsed.name || DEFAULT_PROJECT_NAME);
              
              const cleanedTables = (parsed.tables || []).map((t: any) => ({
                  ...t,
                  rows: Array.isArray(t.rows) ? t.rows : []
              }));
              setTables(cleanedTables);
              
              setRelationships(parsed.relationships || []);
              setValueObjects(parsed.valueObjects || INITIAL_VALUE_OBJECTS);
              setAggregates(parsed.aggregates || INITIAL_AGGREGATES);
              setAggregateData(parsed.aggregateData || INITIAL_AGGREGATE_DATA);
              setAggregateTableOrder(parsed.aggregateTableOrder || INITIAL_AGGREGATE_TABLE_ORDER);
              setMainViewOffset({ x: 0, y: 0 });
              setSubViewOffset({ x: 0, y: 0 });
          } else {
              loadDemoData();
          }
      } catch (e) {
          console.error("Error loading auto-save", e);
          loadDemoData();
      }
      setIsLoading(false);
    };
    loadData();
  }, [loadDemoData, setTables, setRelationships, setValueObjects, setAggregates, setAggregateData, setAggregateTableOrder]);

  // テーブルと集約の自動初期化・同期ロジック
  useEffect(() => {
      if (isLoading) return;

      let hasChanges = false;
      let nextAggregates = [...aggregates];
      let nextAggregateData = { ...aggregateData };
      let nextOrder = [...aggregateTableOrder];

      // 1. tables の中に、現在 aggregateData に所属が登録されていないテーブルがある場合、自動的に集約を作成して Root として割り当てる
      tables.forEach(table => {
          if (!nextAggregateData[table.id]) {
              const newAggId = `agg_auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              nextAggregates.push({
                  id: newAggId,
                  name: table.name
              });
              nextAggregateData[table.id] = {
                  aggregateId: newAggId,
                  role: 'R'
              };
              if (!nextOrder.includes(table.id)) {
                  nextOrder.push(table.id);
              }
              hasChanges = true;
          }
      });

      // 2. 逆に、tables に存在しないテーブルIDが aggregateData や aggregateTableOrder に残っている場合のクリーンアップ
      const tableIds = tables.map(t => t.id);
      Object.keys(nextAggregateData).forEach(tableId => {
          if (!tableIds.includes(tableId)) {
              delete nextAggregateData[tableId];
              hasChanges = true;
          }
      });

      const filteredOrder = nextOrder.filter(id => tableIds.includes(id));
      if (filteredOrder.length !== nextOrder.length) {
          nextOrder = filteredOrder;
          hasChanges = true;
      }

      // 3. 集約名自動追従: 単一テーブルのみが属している集約の名前を、テーブル名と同期する
      tables.forEach(table => {
          const assignment = nextAggregateData[table.id];
          if (assignment) {
              const aggIndex = nextAggregates.findIndex(a => a.id === assignment.aggregateId);
              if (aggIndex !== -1) {
                  const agg = nextAggregates[aggIndex];
                  // この集約に属する他のテーブルがあるか確認
                  const otherTablesInAgg = tables.filter(t => t.id !== table.id && nextAggregateData[t.id]?.aggregateId === agg.id);
                  if (otherTablesInAgg.length === 0) {
                      // 他に所属テーブルがない単一テーブル集約の場合、集約名がテーブル名と異なるなら同期する
                      if (agg.name !== table.name) {
                          nextAggregates[aggIndex] = { ...agg, name: table.name };
                          hasChanges = true;
                      }
                  }
              }
          }
      });

      if (hasChanges) {
          setAggregates(nextAggregates);
          setAggregateData(nextAggregateData);
          setAggregateTableOrder(nextOrder);
      }
  }, [tables, isLoading, aggregates, aggregateData, aggregateTableOrder, setAggregates, setAggregateData, setAggregateTableOrder]);

  useEffect(() => {
      if (isLoading) return;
      
      const save = async () => {
        const cleanedTables = tables.map(t => ({
          ...t,
          rows: Array.isArray(t.rows) ? t.rows : []
        }));

        const saveData = {
          name: projectName,
          tables: cleanedTables,
          relationships,
          valueObjects,
          aggregates,
          aggregateData,
          aggregateTableOrder
        };
        await projectRepository.save(saveData);
      };
      save();
  }, [projectName, tables, relationships, valueObjects, aggregates, aggregateData, aggregateTableOrder, isLoading]);

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
          const generatedData = await aiClient.generateMockData(tables, relationships, apiKey, 3, aiInitialInstructions, aiOtherInstructions, valueObjects);
          
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
            setAggregates([]);
            setAggregateData({});
            setAggregateTableOrder([]);
            setMainViewOffset({ x: 0, y: 0 });
            setSubViewOffset({ x: 0, y: 0 });
          },
          true
      );
  };

  const handleExportMarkdown = async () => {
    const defaultName = 'spec.md';

    const cleanedTables = tables.map(t => ({
      ...t,
      rows: Array.isArray(t.rows) ? t.rows : []
    }));

    const projectData = {
      name: projectName,
      tables: cleanedTables,
      relationships,
      valueObjects,
      aggregates,
      aggregateData,
      aggregateTableOrder,
      version: "1.3", 
      exportedAt: new Date().toISOString()
    };
    const mdString = generateMarkdown(projectData);

    try {
        await fileExporter.exportFile(defaultName, mdString, 'text/markdown', 'md');
    } catch (error: any) {
        alert(error.message || "ファイルの保存に失敗しました。");
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
        const text = event.target.result;
        const match = text.match(/SCHEMA_DESIGNER_METADATA_START([\s\S]*?)SCHEMA_DESIGNER_METADATA_END/);
        
        if (!match) {
          alert('無効なファイル形式です。メタデータが見つかりませんでした。');
          return;
        }

        const json = JSON.parse(match[1].trim());
        
        if (!Array.isArray(json.tables) || !Array.isArray(json.relationships)) {
          alert('メタデータ内のスキーマ情報が無効です。');
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
                setValueObjects(json.valueObjects || INITIAL_VALUE_OBJECTS);
                setAggregates(json.aggregates || []);
                setAggregateData(json.aggregateData || {});
                setAggregateTableOrder(json.aggregateTableOrder || []);
                setMainViewOffset({ x: 0, y: 0 });
                setSubViewOffset({ x: 0, y: 0 });
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
            handleExportMarkdown();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tables, relationships, valueObjects, projectName, aggregates, aggregateData, aggregateTableOrder]);

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



  const editingTable = tables.find(t => t.id === editingTableId) || null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans overflow-hidden text-xs">
      <Header 
        projectName={projectName} setProjectName={setProjectName}
        handleNewProject={handleNewProject} handleImportClick={handleImportClick}
        handleExportMarkdown={handleExportMarkdown} fileInputRef={fileInputRef} handleFileChange={handleFileChange}
        onOpenAggregateModal={handleOpenAggregateModal}
        addTable={() => addTable(canvasRef)}
        onAiGenerateData={handleAiGenerateData} onOpenAiSettings={() => setShowAiSettingsModal(true)}
        onOpenValueObjectSettings={() => setShowValueObjectSettingsModal(true)}
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAlignSubTables={alignSubTables}
      />


      
      <AggregateModal
        showAggregateModal={showAggregateModal}
        setShowAggregateModal={setShowAggregateModal}
        onCancel={handleCancelAggregateEdit}
        tables={tables}
        aggregates={aggregates}
        aggregateData={aggregateData}
        aggregateTableOrder={aggregateTableOrder}
        setAggregateTableOrder={setAggregateTableOrder}
        addAggregate={addAggregate}
        updateAggregateName={updateAggregateName}
        deleteAggregate={deleteAggregate}
        assignTableToAggregate={assignTableToAggregate}
        removeTableFromAggregate={removeTableFromAggregate}
        alignTablesByAggregate={alignTablesByAggregate}
        moveTableOrder={moveTableOrder}
      />
      

      

      
      <TableEditorModal 
        editingTable={editingTable} tables={tables} 
        valueObjects={valueObjects}
        initiateDeleteTable={initiateDeleteTable} updateTableName={updateTableName} 
        updateTableOrderBy={updateTableOrderBy}
        addColumn={addColumn} updateColumn={updateColumn} 
        deleteColumn={deleteColumn} moveColumn={moveColumn}
        relationships={relationships} deleteRelationship={deleteRelationship}
        addFkRelationship={addFkRelationship} updateFkRelationshipParent={updateFkRelationshipParent}
        toggleFkMapping={toggleFkMapping} updateFkMappingParentCol={updateFkMappingParentCol}
        addUniqueKey={addUniqueKey} deleteUniqueKey={deleteUniqueKey} toggleUniqueKeyMapping={toggleUniqueKeyMapping}
        updateTableViewPane={updateTableViewPane}
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
      
      <ValueObjectSettingsModal 
        showModal={showValueObjectSettingsModal} 
        setShowModal={setShowValueObjectSettingsModal} 
        valueObjects={valueObjects} 
        tables={tables}
        onSave={updateValueObjects} 
      />

      <ConfirmModal confirmation={confirmation} setConfirmation={setConfirmation} handleConfirmAction={handleConfirmAction} />
    </div>
  );
}

export default SchemaDesigner;
