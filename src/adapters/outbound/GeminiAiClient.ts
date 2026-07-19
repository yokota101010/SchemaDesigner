import { AiClient } from '../../ports/outbound/AiClient';
import { Table, Relationship, ValueObjectPreset } from '../../domain/models';
import { buildSingleTableResponseSchema, buildSingleTableDerivationSchema, buildInitialValueParsingSchema, buildAllTablesResponseSchema, buildAllTablesDerivationSchema } from '../../utils/aiSchemaBuilder';
import { buildSingleTablePrompt, buildSingleTableDerivationPrompt, buildInitialValueParsingPrompt, buildAllTablesPrompt, buildAllTablesDerivationPrompt } from '../../utils/aiPromptBuilder';
import { mergeMockRows } from '../../utils/mockDataMerger';

const getModel = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('schema-designer-gemini-model') || 'gemini-3.5-flash';
  }
  return 'gemini-3.5-flash';
};

export class GeminiAiClient implements AiClient {
  async generateMockData(
    tables: Table[],
    relationships: Relationship[],
    apiKey: string,
    count = 3,
    initialInstructions = '',
    otherInstructions = '',
    valueObjects: ValueObjectPreset[] = []
  ): Promise<Record<string, any[]>> {
    if (!apiKey) {
      throw new Error("APIキーが設定されていません。");
    }

    const allGeneratedData: Record<string, any[]> = {};

    // 1. 初期値の事前解析フェーズ
    let initialParsedData: Record<string, any[]> = {};
    if (initialInstructions && initialInstructions.trim() !== '') {
      console.log(`[RDB Mock Data Generator] 初期値の事前解析を開始します...`);
      try {
        initialParsedData = await this.parseAndApplyInitialValues(tables, initialInstructions, apiKey);
        console.log(`[RDB Mock Data Generator] 初期値の解析が完了しました。`);
      } catch (err) {
        console.error(`[RDB Mock Data Generator] 初期値解析中にエラーが発生しました:`, err);
        throw err;
      }
    }

    // 各テーブルの初期行を設定する
    tables.forEach(table => {
      const initialRows = initialParsedData[table.id] || [];
      if (initialRows.length > 0) {
        allGeneratedData[table.id] = initialRows.map((row, idx) => ({
          id: `row_ai_init_${Date.now()}_${idx}`,
          ...row
        }));
        console.log(`[RDB Mock Data Generator] テーブル '${table.name}' に初期値レコードを適用しました（${initialRows.length}件）`);
      } else {
        allGeneratedData[table.id] = [];
      }
    });

    // 2. 第1段階: 全テーブルのデータ一括生成（生の入力項目のみ）
    console.log(`[RDB Mock Data Generator] 第1段階: 全テーブルの一括データ生成を開始...`);
    try {
      if (initialInstructions && initialInstructions.trim() !== '') {
        console.log(`[RDB Mock Data Generator] レートリミット制限回避のため 5000ms 待機中...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const generatedData = await this.generateAllTablesData(tables, relationships, allGeneratedData, apiKey, count, otherInstructions, valueObjects);

      // 生成された各テーブルのデータをマージする
      tables.forEach(table => {
        const generatedRows = generatedData[table.id] || [];
        const existingRows = allGeneratedData[table.id] || [];
        const pkCols = table.columns.filter(col => col.isPk);

        const finalRows = mergeMockRows(existingRows, generatedRows, pkCols);

        // 導出カラムの初期値（空文字列）を設定する
        const dependentCols = table.columns.filter(c => c.attributeType === 'dependent' && !table.columns.some(x => x.parentColumnId === c.id));
        allGeneratedData[table.id] = finalRows.map(row => {
          const updatedRow = { ...row };
          dependentCols.forEach(col => {
            if (updatedRow[col.id] === undefined) {
              updatedRow[col.id] = "";
            }
          });
          return updatedRow;
        });

        console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の一括生成が完了しました（合計: ${allGeneratedData[table.id].length}件）`);
      });
    } catch (err) {
      console.error(`[RDB Mock Data Generator] 一括データ生成中にエラーが発生しました:`, err);
      throw err;
    }

    // 3. 第2段階: 導出項目の一括計算
    console.log("[RDB Mock Data Generator] 第1段階完了。クールダウンのため 5000ms 待機します...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("[RDB Mock Data Generator] 第2段階: 全テーブルの導出項目の一括計算を開始します...");
    try {
      const calculatedData = await this.calculateAllTablesDerivations(tables, relationships, allGeneratedData, apiKey, otherInstructions);
      console.log(`[RDB Mock Data Generator] 第2段階の計算結果を受信しました:`, calculatedData);

      // 各テーブルの計算結果をマージする
      tables.forEach(table => {
        const tableData = calculatedData[table.id] || {};
        const calculatedRows = Array.isArray(tableData.rows) ? tableData.rows : [];
        const currentTableData = allGeneratedData[table.id] || [];
        const pkCols = table.columns.filter(col => col.isPk && col.attributeType !== 'dependent' && !table.columns.some(x => x.parentColumnId === col.id));

        allGeneratedData[table.id] = currentTableData.map((row, idx) => {
          let match = null;
          if (pkCols.length === 0) {
            match = calculatedRows[idx];
          } else {
            match = calculatedRows.find((r: any) => {
              return pkCols.every(pkCol => {
                return r[pkCol.id] !== undefined && row[pkCol.id] !== undefined && String(r[pkCol.id]) === String(row[pkCol.id]);
              });
            });
            
            // 主キーでのマッチングに失敗した場合、同じ行番号（インデックス）のデータを代替で使用する（AIのブレ防止）
            if (!match && calculatedRows[idx]) {
              match = calculatedRows[idx];
            }
          }

          if (match) {
            const merged = { ...row };
            table.columns.forEach(col => {
              if (col.attributeType === 'dependent' && match[col.id] !== undefined) {
                merged[col.id] = match[col.id];
              }
            });
            return merged;
          }
          return row;
        });

        console.log(`[RDB Mock Data Generator] テーブル '${table.name}' の導出計算が完了しました`);
      });
    } catch (err) {
      console.error(`[RDB Mock Data Generator] 一括導出計算中にエラーが発生しました:`, err);
      throw err;
    }

    return allGeneratedData;
  }

  private async parseAndApplyInitialValues(tables: Table[], initialInstructions: string, apiKey: string): Promise<any> {
    const prompt = buildInitialValueParsingPrompt(tables, initialInstructions);
    const responseSchema = buildInitialValueParsingSchema(tables);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error for Initial Value Parsing:`, errText);
      throw new Error(`初期値の事前解析に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
      const textResponse = json.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(textResponse);
      return parsed.tables || {};
    } catch (e) {
      console.error("JSON parsing error for Initial Value Parsing:", e);
      throw new Error("初期値解析レスポンスのJSONパースに失敗しました。");
    }
  }

  private async generateAllTablesData(
    tables: Table[],
    relationships: Relationship[],
    parentData: Record<string, any[]>,
    apiKey: string,
    rowCount: number,
    otherInstructions = '',
    valueObjects: ValueObjectPreset[] = []
  ): Promise<any> {
    const prompt = buildAllTablesPrompt(tables, relationships, parentData, rowCount, otherInstructions, valueObjects);
    const responseSchema = buildAllTablesResponseSchema(tables, relationships);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error for all tables generation:`, errText);
      throw new Error(`一括モックデータの生成に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
      const textResponse = json.candidates[0].content.parts[0].text;
      return JSON.parse(textResponse);
    } catch (e) {
      console.error(`JSON parsing error for all tables generation:`, e);
      throw new Error(`一括モックデータ生成レスポンスのJSON解析に失敗しました。`);
    }
  }

  private async calculateAllTablesDerivations(
    tables: Table[],
    relationships: Relationship[],
    allGeneratedData: Record<string, any[]>,
    apiKey: string,
    otherInstructions = ''
  ): Promise<any> {
    const prompt = buildAllTablesDerivationPrompt(tables, allGeneratedData, otherInstructions);
    const responseSchema = buildAllTablesDerivationSchema(tables, relationships);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${getModel()}:generateContent?key=${apiKey}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API Error for all tables derivation:`, errText);
      throw new Error(`一括導出計算に失敗しました (${response.status})`);
    }

    const json = await response.json();
    try {
      const textResponse = json.candidates[0].content.parts[0].text;
      return JSON.parse(textResponse);
    } catch (e) {
      console.error(`JSON parsing error for all tables derivation:`, e);
      throw new Error(`一括導出計算レスポンスのJSON解析に失敗しました。`);
    }
  }

  private async fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
    let delay = 10000;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (response.status === 429) {
            delay = Math.max(delay, 60000); // レート制限解除のため最初から60秒待機
            try {
              const clonedResponse = response.clone();
              const errJson = await clonedResponse.json();
              const errMsg = errJson?.error?.message || "";
              const lowerMsg = errMsg.toLowerCase();
              if (
                lowerMsg.includes("day") || 
                lowerMsg.includes("daily") || 
                lowerMsg.includes("quota") || 
                lowerMsg.includes("limit") || 
                lowerMsg.includes("exhausted")
              ) {
                console.error(`[Gemini API] 利用上限（Quota Exceeded/Limit）に達したため、リトライを中止します: ${errMsg}`);
                return response;
              }
            } catch (jsonErr) {
              // Ignore parse error
            }
          }

          if (i === maxRetries - 1) {
            return response;
          }
          console.warn(`[Gemini API] ステータス ${response.status} を検出。${delay}ms 待機して自動リトライします... (試行 ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2.0, 60000); // 最大でも60秒以上は増やさない
          continue;
        }
        return response;
      } catch (err: any) {
        if (i === maxRetries - 1) throw err;
        console.warn(`[Gemini API] 通信エラー: ${err.message}。${delay}ms 後に自動リトライします... (試行 ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2.0, 60000);
      }
    }
    throw new Error("Fetch failed after maximum retries");
  }
}
