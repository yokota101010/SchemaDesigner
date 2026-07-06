import { ProjectData } from '../domain/models/Project';
import { Table, Column } from '../domain/models/Table';
import { Relationship } from '../domain/models/Relationship';
import { ValueObjectPreset } from '../domain/models/ValueObject';
import { Aggregate, AggregateData } from '../domain/models/Aggregate';

/**
 * プロジェクトの設計データを GitHub Spec Kit が解釈しやすい Markdown 形式に変換します。
 * 末尾に本ツールでのインポート復元用 JSON を埋め込みます。
 */
export function generateMarkdown(projectData: ProjectData): string {
  const {
    name: projectName,
    tables = [],
    relationships = [],
    valueObjects = [],
    aggregates = [],
    aggregateData = {},
    exportedAt = new Date().toISOString()
  } = projectData;

  let md = '';

  // 1. ヘッダー
  md += `# ${projectName} - 仕様書 (Database & Domain Schema)\n\n`;
  md += `> [!NOTE]\n`;
  md += `> この仕様書は DB Architect (Schema Designer) から自動出力されました。\n`;
  md += `> 出力日時: ${new Date(exportedAt).toLocaleString('ja-JP')}\n\n`;

  // 2. ドメイン集約 (Aggregates) の定義
  if (aggregates.length > 0) {
    md += `## 1. ドメイン集約 (Domain Aggregates)\n\n`;
    md += `トランザクションの整合性を保つ境界となる集約の定義です。\n\n`;

    aggregates.forEach(agg => {
      md += `### 集約: ${agg.name}\n`;
      
      const memberTables: string[] = [];
      let rootTable = '';

      Object.entries(aggregateData).forEach(([tableId, assign]) => {
        if (assign.aggregateId === agg.id) {
          const table = tables.find(t => t.id === tableId);
          if (table) {
            if (assign.role === 'R') {
              rootTable = `\`${table.name}\``;
            } else {
              memberTables.push(`\`${table.name}\``);
            }
          }
        }
      });

      if (rootTable) {
        md += `- 👑 **集約ルート (Aggregate Root)**: ${rootTable}\n`;
      }
      if (memberTables.length > 0) {
        md += `- 🔗 **集約メンバー (Members)**: ${memberTables.join(', ')}\n`;
      }
      if (!rootTable && memberTables.length === 0) {
        md += `- (所属するテーブルはありません)\n`;
      }
      md += `\n`;
    });

    // 未分類のテーブル
    const classifiedTableIds = new Set(Object.keys(aggregateData));
    const unclassifiedTables = tables.filter(t => !classifiedTableIds.has(t.id));
    if (unclassifiedTables.length > 0) {
      md += `### その他 (集約未設定)\n`;
      md += `- テーブル: ${unclassifiedTables.map(t => `\`${t.name}\``).join(', ')}\n\n`;
    }
  }

  // 3. 値オブジェクト定義 (Value Objects)
  if (valueObjects.length > 0) {
    md += `## 2. 値オブジェクト定義 (Value Objects)\n\n`;
    md += `ドメインモデルで再利用されるデータの型とビジネスルールです。\n\n`;

    valueObjects.forEach(vo => {
      md += `### \`${vo.name}\`\n`;
      md += `**ビジネスルール・制約条件**:\n${vo.description || '特になし'}\n\n`;
      md += `**プロパティ構成**:\n\n`;
      md += `| プロパティ名 | データ型 | 説明 |\n`;
      md += `| :--- | :--- | :--- |\n`;
      vo.properties.forEach(prop => {
        md += `| \`${prop.name}\` | \`${prop.type}\` | ${prop.description || ''} |\n`;
      });
      md += `\n`;
    });
  }

  // 4. テーブル・カラム定義 (Tables & Columns)
  md += `## 3. テーブル定義 (Tables & Columns)\n\n`;
  md += `データベースの各テーブル定義およびビジネスルールです。\n\n`;

  tables.forEach(table => {
    md += `### テーブル: \`${table.name}\`\n`;
    const viewPaneText = table.viewPane === 'sub' ? ' (サブビュー / マスタ等)' : ' (メインビュー)';
    md += `* ビュー分類: ${viewPaneText}\n\n`;

    if (table.description && table.description.trim() !== '') {
      md += `**テーブル全体のビジネスルール・制約条件**:\n${table.description}\n\n`;
    }

    // カラム定義の表
    md += `#### スキーマ定義\n\n`;
    md += `| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |\n`;
    md += `| :--- | :--- | :---: | :---: | :---: | :--- | :--- |\n`;

    table.columns.forEach(col => {
      const pk = col.isPk ? '✅' : '';
      
      // FKの親情報解決
      let fk = '';
      if (col.isFk) {
        const rel = relationships.find(r => r.to === table.id && r.mappings.some(m => m.childColId === col.id));
        if (rel) {
          const parentTable = tables.find(t => t.id === rel.from);
          const mapping = rel.mappings.find(m => m.childColId === col.id);
          const parentCol = parentTable?.columns.find(c => c.id === mapping?.parentColId);
          if (parentTable && parentCol) {
            fk = `✅ (\`${parentTable.name}.${parentCol.name}\`)`;
          } else {
            fk = '✅';
          }
        } else {
          fk = '✅';
        }
      }

      // UQの解決
      const isUnique = col.isUnique || table.uniqueKeys?.some(uk => uk.columnIds.includes(col.id));
      const uq = isUnique ? '✅' : '';

      const attrType = col.attributeType === 'dependent' ? '導出項目' : '独立';
      
      // 説明とルール構築
      let desc = col.description || '';
      if (col.attributeType === 'dependent' && col.derivation) {
        desc += `\n* 導出式: \`${col.derivation}\``;
      }
      if (col.isVoProperty && col.voPropertyName) {
        desc += `\n* 値オブジェクト \`${col.voPropertyName}\` の展開カラム`;
      }
      
      // テーブル表記内の改行を <br /> に変換してMarkdown崩れを防ぐ
      const safeDesc = desc.replace(/\r?\n/g, '<br />');

      md += `| \`${col.name}\` | \`${col.type}\` | ${pk} | ${fk} | ${uq} | ${attrType} | ${safeDesc} |\n`;
    });
    md += `\n`;

    // テスト用モックデータ (Seed Data) の表
    md += `#### AI検証用テストデータ (Seed Data)\n\n`;
    if (table.rows && table.rows.length > 0) {
      // ヘッダー行
      md += `| ` + table.columns.map(c => c.name).join(' | ') + ` |\n`;
      md += `| ` + table.columns.map(() => '---').join(' | ') + ` |\n`;
      
      // データ行
      table.rows.forEach(row => {
        const cells = table.columns.map(col => {
          const val = row[col.id];
          return val !== undefined && val !== null ? String(val) : '';
        });
        md += `| ` + cells.join(' | ') + ` |\n`;
      });
      md += `\n`;
    } else {
      md += `* ※ テストデータは生成されていません。\n\n`;
    }

    md += `---\n\n`;
  });

  // 5. ツール用メタデータの埋め込み (HTMLコメント)
  md += `<!-- \n`;
  md += `[SYSTEM METADATA - DO NOT USE FOR IMPLEMENTATION CODE GENERATION]\n`;
  md += `The following JSON is only used by DB Architect (Schema Designer) to restore the UI layout and state.\n`;
  md += `SCHEMA_DESIGNER_METADATA_START\n`;
  md += JSON.stringify(projectData, null, 2);
  md += `\nSCHEMA_DESIGNER_METADATA_END\n`;
  md += `-->\n`;

  return md;
}
