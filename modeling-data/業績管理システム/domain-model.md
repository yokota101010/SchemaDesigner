# PerformanceFlow - 仕様書 (Database & Domain Schema)

> [!NOTE]
> この仕様書は DB Architect (Schema Designer) から自動出力されました。
> 出力日時: 2026/7/19 22:23:42

## 1. ドメイン集約 (Domain Aggregates)

トランザクションの整合性を保つ境界となる集約の定義です。

### 集約: プロジェクト
- 👑 **集約ルート (Aggregate Root)**: `プロジェクト`

### 集約: 案件
- 👑 **集約ルート (Aggregate Root)**: `案件`

### 集約: 発注
- 👑 **集約ルート (Aggregate Root)**: `発注`
- 🔗 **集約メンバー (Members)**: `注文明細`

### 集約: 月別案件社員工数
- 👑 **集約ルート (Aggregate Root)**: `月別案件社員工数`
- 🔗 **集約メンバー (Members)**: `月別社員工数サマリ`

### 集約: 社員
- 👑 **集約ルート (Aggregate Root)**: `社員`

### 集約: 発注先
- 👑 **集約ルート (Aggregate Root)**: `発注先`

### 集約: 要員
- 👑 **集約ルート (Aggregate Root)**: `要員`

### 集約: 月別要員工数サマリ
- 👑 **集約ルート (Aggregate Root)**: `月別要員工数サマリ`

### 集約: その他経費
- 👑 **集約ルート (Aggregate Root)**: `その他経費`

### 集約: 案件作業明細
- 👑 **集約ルート (Aggregate Root)**: `案件作業明細`

## 2. 値オブジェクト定義 (Value Objects)

※ 値オブジェクトは定義されていません。

## 3. テーブル定義 (Tables & Columns)

データベースの各テーブル定義およびビジネスルールです。

### テーブル: `案件作業明細`
* ビュー分類:  (メインビュー)

**テーブル全体のビジネスルール・制約条件**:
`プロジェクトID` と `案件ID` が同一の明細に関して `開始日` と `終了日` が次の条件を満たすこと。
- `開始日` から `終了日` までの期間に重複が無いこと。
- 最も早い `開始日` ＝ 紐づく案件の `開始日` であること。
- 最も遅い `終了日` ＝ 紐づく案件の `終了日` であること。

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `作業契約ID` | `VARCHAR(255)` | ✅ |  |  | 独立 |  |
| `プロジェクトID` | `VARCHAR(255)` |  | ✅ (`案件.プロジェクトID`) | ✅ (UQ1) | 独立 |  |
| `案件ID` | `VARCHAR(255)` |  | ✅ (`案件.案件ID`) | ✅ (UQ1) | 独立 |  |
| `開始日` | `DATE` |  |  | ✅ (UQ1) | 独立 |  |
| `終了日` | `DATE` |  |  |  | 導出項目 | <br />* 導出式: `同一の `プロジェクトID` かつ `案件ID` のグループ内において、以下のルールで各行の `終了日` を設定する。<br />1. 直後に別の期間が続く場合<br />   - `開始日` の昇順でソートしたとき、当該行の直後の行の `開始日` の前日を設定する。<br />2. 直後に該当する行が無い場合（最終行の場合）<br />   - 紐づく `案件` の `終了日` を設定する。` |
| `契約工数` | `DECIMAL` |  |  |  | 独立 | 単位は人月。 |
| `契約単価` | `INT` |  |  |  | 独立 |  |
| `売上` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``契約工数` × `契約単価` を設定。` |
| `製造原価` | `INT` |  |  |  | 導出項目 | <br />* 導出式: `下記3項目の合計を設定。<br />- `作業契約ID' で紐づく `発注` の `合計発注額` の合計。<br />- `作業契約ID` で紐づく `月別案件社員工数` の `加工費` の合計。<br />- `作業契約ID` で紐づく `その他経費` の金額の合計。` |
| `粗利` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``売上` － `製造原価` を設定。` |
| `粗利率` | `FLOAT` |  |  |  | 導出項目 | <br />* 導出式: `- `粗利` ÷ `売上` を設定。<br />- 小数点以下の桁数は常時2桁（小数点以下第3位を四捨五入）。` |

#### AI検証用テストデータ (Seed Data)

| 作業契約ID | プロジェクトID | 案件ID | 開始日 | 終了日 | 契約工数 | 契約単価 | 売上 | 製造原価 | 粗利 | 粗利率 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WK001 | PJ001 | AJ001 | 2026-08-15 | 2026-09-30 | 10.0 | 800000 | 8000000 | 5242000 | 2758000 | 0.34 |
| WK002 | PJ001 | AJ001 | 2026-10-01 | 2026-11-15 | 10.0 | 800000 | 8000000 | 5215000 | 2785000 | 0.35 |
| WK003 | PJ001 | AJ002 | 2026-09-13 | 2026-09-30 | 2.0 | 700000 | 1400000 | 2490000 | -1090000 | -0.78 |
| WK004 | PJ001 | AJ002 | 2026-10-01 | 2026-10-31 | 2.0 | 700000 | 1400000 | 2490000 | -1090000 | -0.78 |

---

### テーブル: `プロジェクト`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `プロジェクトID` | `VARCHAR(255)` | ✅ |  |  | 独立 | 形式：PJnnn<br />- PJ は固定文字列<br />- nnn は001から始まる連番 |
| `プロジェクト名` | `VARCHAR(255)` |  |  | ✅ (UQ1) | 独立 |  |

#### AI検証用テストデータ (Seed Data)

| プロジェクトID | プロジェクト名 |
| --- | --- |
| PJ001 | 次世代基幹システム開発プロジェクト |

---

### テーブル: `案件`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `プロジェクトID` | `VARCHAR(255)` | ✅ | ✅ (`プロジェクト.プロジェクトID`) |  | 独立 |  |
| `案件ID` | `VARCHAR(255)` | ✅ |  |  | 独立 |  |
| `案件名` | `VARCHAR(255)` |  |  |  | 独立 |  |
| `開始日` | `DATE` |  |  |  | 独立 |  |
| `終了日` | `DATE` |  |  |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

| プロジェクトID | 案件ID | 案件名 | 開始日 | 終了日 |
| --- | --- | --- | --- | --- |
| PJ001 | AJ001 | 案件1: Ａソフト開発支援 | 2026-08-15 | 2026-11-15 |
| PJ001 | AJ002 | 案件2: Ｂエンジニアリング開発支援 | 2026-09-13 | 2026-10-31 |

---

### テーブル: `発注`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `注文ID` | `VARCHAR(255)` | ✅ |  |  | 独立 |  |
| `作業契約ID` | `VARCHAR(255)` |  | ✅ (`案件作業明細.作業契約ID`) | ✅ (UQ1) | 独立 |  |
| `発注先ID` | `VARCHAR(255)` |  | ✅ (`発注先.発注先ID`) | ✅ (UQ1) | 独立 |  |
| `年月` | `DATE` |  |  | ✅ (UQ1) | 独立 | - YYYY-MM-01形式。<br />- `作業契約ID` で紐づく `案件作業明細` の `開始日` から `終了日` までの期間と重なる期間があること。 |
| `合計工数` | `DECIMAL` |  |  |  | 導出項目 | <br />* 導出式: ``注文ID` で紐づく `注文明細` の `発注工数` の合計を設定。` |
| `合計発注額` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``注文ID` で紐づく `注文明細` の `発注額` を合計を設定。` |

#### AI検証用テストデータ (Seed Data)

| 注文ID | 作業契約ID | 発注先ID | 年月 | 合計工数 | 合計発注額 |
| --- | --- | --- | --- | --- | --- |
| ORD001 | WK001 | BP001 | 2026-08-01 | 1.3 | 1150000 |
| ORD002 | WK001 | BP001 | 2026-09-01 | 1.3 | 1150000 |
| ORD003 | WK002 | BP001 | 2026-10-01 | 1.3 | 1150000 |
| ORD004 | WK002 | BP001 | 2026-11-01 | 1.3 | 1150000 |
| ORD005 | WK003 | BP002 | 2026-09-01 | 1.6 | 1210000 |
| ORD006 | WK004 | BP002 | 2026-10-01 | 1.6 | 1210000 |

---

### テーブル: `月別案件社員工数`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `作業契約ID` | `VARCHAR(255)` | ✅ | ✅ (`案件作業明細.作業契約ID`) |  | 独立 |  |
| `社員ID` | `VARCHAR(255)` | ✅ | ✅ (`月別社員工数サマリ.社員ID`), ✅ (`社員.社員ID`) |  | 独立 |  |
| `年月` | `DATE` | ✅ | ✅ (`月別社員工数サマリ.年月`) |  | 独立 | YYYY-MM-01形式。 |
| `作業時間` | `INT` |  |  |  | 独立 | - 基本的に1人月は160時間。<br />- 0以上200以下の値を取る。 |
| `加工費` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``社員ID` で紐づく `社員` テーブルの `単価` × `作業時間` を設定。` |

#### AI検証用テストデータ (Seed Data)

| 作業契約ID | 社員ID | 年月 | 作業時間 | 加工費 |
| --- | --- | --- | --- | --- |
| WK001 | EMP001 | 2026-08-01 | 160 | 1440000 |
| WK001 | EMP001 | 2026-09-01 | 160 | 1440000 |
| WK002 | EMP001 | 2026-10-01 | 160 | 1440000 |
| WK002 | EMP001 | 2026-11-01 | 160 | 1440000 |
| WK003 | EMP002 | 2026-09-01 | 160 | 1280000 |
| WK004 | EMP002 | 2026-10-01 | 160 | 1280000 |

---

### テーブル: `社員`
* ビュー分類:  (サブビュー / マスタ等)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `社員ID` | `VARCHAR(255)` | ✅ |  |  | 独立 | 形式：EMPnnn<br />- EMP は固定文字列<br />- nnn は001から始まる連番 |
| `社員名` | `VARCHAR(255)` |  |  |  | 独立 |  |
| `単価` | `INT` |  |  |  | 独立 | 時間単位の金額。 |

#### AI検証用テストデータ (Seed Data)

| 社員ID | 社員名 | 単価 |
| --- | --- | --- |
| EMP001 | トム・デマルコ | 9000 |
| EMP002 | ロバート・マーチン | 8000 |
| EMP003 | マーチン・ファウラー | 10000 |

---

### テーブル: `月別社員工数サマリ`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `社員ID` | `VARCHAR(255)` | ✅ | ✅ (`社員.社員ID`) |  | 独立 |  |
| `年月` | `DATE` | ✅ |  |  | 独立 | YYYY-MM-01形式。 |
| `作業時間` | `INT` |  |  |  | 導出項目 | 1人月は160時間。<br />0以上200以下の値を設定。<br />* 導出式: ``社員ID` と `年月` で紐づく `月別案件社員工数` テーブルの `作業時間` の合計を設定。` |

#### AI検証用テストデータ (Seed Data)

| 社員ID | 年月 | 作業時間 |
| --- | --- | --- |
| EMP001 | 2026-08-01 | 160 |
| EMP001 | 2026-09-01 | 160 |
| EMP001 | 2026-10-01 | 160 |
| EMP001 | 2026-11-01 | 160 |
| EMP002 | 2026-09-01 | 160 |
| EMP002 | 2026-10-01 | 160 |

---

### テーブル: `発注先`
* ビュー分類:  (サブビュー / マスタ等)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `発注先ID` | `VARCHAR(255)` | ✅ |  |  | 独立 | 形式：BPnnn<br />- BP は固定文字列<br />- nnn は001から始まる連番 |
| `発注先名` | `VARCHAR(255)` |  |  | ✅ (UQ1) | 独立 |  |

#### AI検証用テストデータ (Seed Data)

| 発注先ID | 発注先名 |
| --- | --- |
| BP001 | Ａソフトウェア |
| BP002 | Ｂエンジニアリング |

---

### テーブル: `要員`
* ビュー分類:  (サブビュー / マスタ等)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `要員ID` | `VARCHAR(255)` | ✅ |  |  | 独立 | 形式：MEMnnn<br />- MEM は固定文字列<br />- nnn は001から始まる連番 |
| `所属会社ID` | `VARCHAR(255)` |  | ✅ (`発注先.発注先ID`) |  | 独立 |  |
| `氏名` | `VARCHAR(255)` |  |  |  | 独立 |  |
| `単価` | `INT` |  |  |  | 独立 | 月単位の金額。 |

#### AI検証用テストデータ (Seed Data)

| 要員ID | 所属会社ID | 氏名 | 単価 |
| --- | --- | --- | --- |
| MEM001 | BP001 | 坂本龍馬 | 1000000 |
| MEM002 | BP001 | 高杉晋作 | 700000 |
| MEM003 | BP002 | 西郷隆盛 | 850000 |
| MEM004 | BP002 | 勝海舟 | 600000 |

---

### テーブル: `月別要員工数サマリ`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `要員ID` | `VARCHAR(255)` | ✅ | ✅ (`要員.要員ID`) |  | 独立 |  |
| `年月` | `DATE` | ✅ |  |  | 独立 | YYYY-MM-01形式。 |
| `合計工数` | `DECIMAL` |  |  |  | 導出項目 | <br />* 導出式: ``要員ID` と `年月` で紐づく `注文明細` テーブルの `発注工数` の合計を設定。` |

#### AI検証用テストデータ (Seed Data)

| 要員ID | 年月 | 合計工数 |
| --- | --- | --- |
| MEM001 | 2026-08-01 | 0.8 |
| MEM001 | 2026-09-01 | 0.8 |
| MEM001 | 2026-10-01 | 0.8 |
| MEM001 | 2026-11-01 | 0.8 |
| MEM002 | 2026-08-01 | 0.5 |
| MEM002 | 2026-09-01 | 0.5 |
| MEM002 | 2026-10-01 | 0.5 |
| MEM002 | 2026-11-01 | 0.5 |
| MEM003 | 2026-09-01 | 1.0 |
| MEM003 | 2026-10-01 | 1.0 |
| MEM004 | 2026-09-01 | 0.6 |
| MEM004 | 2026-10-01 | 0.6 |

---

### テーブル: `注文明細`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `注文ID` | `VARCHAR(255)` | ✅ | ✅ (`発注.注文ID`) |  | 独立 |  |
| `要員ID` | `VARCHAR(255)` | ✅ | ✅ (`月別要員工数サマリ.要員ID`), ✅ (`要員.要員ID`) |  | 独立 | 下記2項目の値が等しい必要がある。<br />- `要員ID` で紐づく `要員` テーブルのレコードの `所属会社ID`<br />- `注文ID` で紐づく `発注` テーブルのレコードの `発注先ID` |
| `発注工数` | `DECIMAL` |  |  |  | 独立 | - 単位は人月。<br />- 0以上1以下の値を取る。<br />- 小数点以下の桁数は1桁。 |
| `発注単価` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``要員ID` で紐づく `要員` テーブルの `単価` を設定。` |
| `年月` | `DATE` |  | ✅ (`月別要員工数サマリ.年月`) |  | 導出項目 | <br />* 導出式: ``注文ID` で紐づく `発注` の `年月` を設定。` |
| `発注先ID` | `VARCHAR(255)` |  | ✅ (`発注先.発注先ID`) |  | 導出項目 | <br />* 導出式: ``注文ID` で紐づく `発注` の `発注先ID` を設定。` |
| `発注額` | `INT` |  |  |  | 導出項目 | <br />* 導出式: ``発注工数` × `発注単価` を設定。` |

#### AI検証用テストデータ (Seed Data)

| 注文ID | 要員ID | 発注工数 | 発注単価 | 年月 | 発注先ID | 発注額 |
| --- | --- | --- | --- | --- | --- | --- |
| ORD001 | MEM001 | 0.8 | 1000000 | 2026-08-01 | BP001 | 800000 |
| ORD001 | MEM002 | 0.5 | 700000 | 2026-08-01 | BP001 | 350000 |
| ORD002 | MEM001 | 0.8 | 1000000 | 2026-09-01 | BP001 | 800000 |
| ORD002 | MEM002 | 0.5 | 700000 | 2026-09-01 | BP001 | 350000 |
| ORD003 | MEM001 | 0.8 | 1000000 | 2026-10-01 | BP001 | 800000 |
| ORD003 | MEM002 | 0.5 | 700000 | 2026-10-01 | BP001 | 350000 |
| ORD004 | MEM001 | 0.8 | 1000000 | 2026-11-01 | BP001 | 800000 |
| ORD004 | MEM002 | 0.5 | 700000 | 2026-11-01 | BP001 | 350000 |
| ORD005 | MEM003 | 1.0 | 850000 | 2026-09-01 | BP002 | 850000 |
| ORD005 | MEM004 | 0.6 | 600000 | 2026-09-01 | BP002 | 360000 |
| ORD006 | MEM003 | 1.0 | 850000 | 2026-10-01 | BP002 | 850000 |
| ORD006 | MEM004 | 0.6 | 600000 | 2026-10-01 | BP002 | 360000 |

---

### テーブル: `その他経費`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `作業契約ID` | `VARCHAR(255)` | ✅ | ✅ (`案件作業明細.作業契約ID`) |  | 独立 |  |
| `行No` | `INT` | ✅ |  |  | 独立 |  |
| `金額` | `INT` |  |  |  | 独立 |  |
| `摘要` | `VARCHAR(255)` |  |  |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

| 作業契約ID | 行No | 金額 | 摘要 |
| --- | --- | --- | --- |
| WK001 | 1 | 50000 | 旅費交通費 |
| WK001 | 2 | 12000 | 会議費 |
| WK002 | 1 | 35000 | 消耗品費 |

---

<!-- 
[SYSTEM METADATA - DO NOT USE FOR IMPLEMENTATION CODE GENERATION]
The following JSON is only used by DB Architect (Schema Designer) to restore the UI layout and state.
SCHEMA_DESIGNER_METADATA_START
{
  "name": "PerformanceFlow",
  "tables": [
    {
      "id": "table_1784066301594",
      "name": "案件作業明細",
      "x": 188.21533203125,
      "y": 1478.3337707519531,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784071378702",
          "name": "作業契約ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784066667331",
          "name": "プロジェクトID",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784066610123",
            "columnId": "col_1784066610123"
          }
        },
        {
          "id": "col_1784066301594",
          "name": "案件ID",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784066610123",
            "columnId": "col_1784066628256"
          }
        },
        {
          "id": "col_1784066338066",
          "name": "開始日",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784066350695",
          "name": "終了日",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "同一の `プロジェクトID` かつ `案件ID` のグループ内において、以下のルールで各行の `終了日` を設定する。\n1. 直後に別の期間が続く場合\n   - `開始日` の昇順でソートしたとき、当該行の直後の行の `開始日` の前日を設定する。\n2. 直後に該当する行が無い場合（最終行の場合）\n   - 紐づく `案件` の `終了日` を設定する。",
          "isVisible": true
        },
        {
          "id": "col_1784066357349",
          "name": "契約工数",
          "type": "DECIMAL",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "単位は人月。"
        },
        {
          "id": "col_1784066362763",
          "name": "契約単価",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784155243361",
          "name": "売上",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`契約工数` × `契約単価` を設定。",
          "isVisible": true
        },
        {
          "id": "col_1784066374233",
          "name": "製造原価",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "下記3項目の合計を設定。\n- `作業契約ID' で紐づく `発注` の `合計発注額` の合計。\n- `作業契約ID` で紐づく `月別案件社員工数` の `加工費` の合計。\n- `作業契約ID` で紐づく `その他経費` の金額の合計。",
          "isVisible": true
        },
        {
          "id": "col_1784157658902",
          "name": "粗利",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`売上` － `製造原価` を設定。",
          "isVisible": true
        },
        {
          "id": "col_1784320364977",
          "name": "粗利率",
          "type": "FLOAT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "- `粗利` ÷ `売上` を設定。\n- 小数点以下の桁数は常時2桁（小数点以下第3位を四捨五入）。",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502828_lei9n",
          "col_1784071378702": "WK001",
          "col_1784066667331": "PJ001",
          "col_1784066301594": "AJ001",
          "col_1784066338066": "2026-08-15",
          "col_1784066357349": "10.0",
          "col_1784066362763": "800000",
          "col_1784066350695": "2026-09-30",
          "col_1784155243361": "8000000",
          "col_1784066374233": "5242000",
          "col_1784157658902": "2758000",
          "col_1784320364977": "0.34"
        },
        {
          "id": "row_ai_1784322502828_f3h4m",
          "col_1784071378702": "WK002",
          "col_1784066667331": "PJ001",
          "col_1784066301594": "AJ001",
          "col_1784066338066": "2026-10-01",
          "col_1784066357349": "10.0",
          "col_1784066362763": "800000",
          "col_1784066350695": "2026-11-15",
          "col_1784155243361": "8000000",
          "col_1784066374233": "5215000",
          "col_1784157658902": "2785000",
          "col_1784320364977": "0.35"
        },
        {
          "id": "row_ai_1784322502828_ni9yz",
          "col_1784071378702": "WK003",
          "col_1784066667331": "PJ001",
          "col_1784066301594": "AJ002",
          "col_1784066338066": "2026-09-13",
          "col_1784066357349": "2.0",
          "col_1784066362763": "700000",
          "col_1784066350695": "2026-09-30",
          "col_1784155243361": "1400000",
          "col_1784066374233": "2490000",
          "col_1784157658902": "-1090000",
          "col_1784320364977": "-0.78"
        },
        {
          "id": "row_ai_1784322502828_9esp9",
          "col_1784071378702": "WK004",
          "col_1784066667331": "PJ001",
          "col_1784066301594": "AJ002",
          "col_1784066338066": "2026-10-01",
          "col_1784066357349": "2.0",
          "col_1784066362763": "700000",
          "col_1784066350695": "2026-10-31",
          "col_1784155243361": "1400000",
          "col_1784066374233": "2490000",
          "col_1784157658902": "-1090000",
          "col_1784320364977": "-0.78"
        }
      ],
      "uniqueKeys": [
        {
          "id": "uq_1784071420483",
          "columnIds": [
            "col_1784066667331",
            "col_1784066301594",
            "col_1784066338066"
          ]
        }
      ],
      "description": "`プロジェクトID` と `案件ID` が同一の明細に関して `開始日` と `終了日` が次の条件を満たすこと。\n- `開始日` から `終了日` までの期間に重複が無いこと。\n- 最も早い `開始日` ＝ 紐づく案件の `開始日` であること。\n- 最も遅い `終了日` ＝ 紐づく案件の `終了日` であること。"
    },
    {
      "id": "table_1784066570927",
      "name": "プロジェクト",
      "x": 27,
      "y": 68,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784066570927",
          "name": "プロジェクトID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "形式：PJnnn\n- PJ は固定文字列\n- nnn は001から始まる連番"
        },
        {
          "id": "col_1784066590833",
          "name": "プロジェクト名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_egz1l",
          "col_1784066570927": "PJ001",
          "col_1784066590833": "次世代基幹システム開発プロジェクト"
        }
      ],
      "orderBy": {
        "type": "",
        "uqId": "",
        "direction": "ASC",
        "keys": []
      },
      "uniqueKeys": [
        {
          "id": "uq_1784335530324",
          "columnIds": [
            "col_1784066590833"
          ]
        }
      ]
    },
    {
      "id": "table_1784066610123",
      "name": "案件",
      "x": 107.03836059570312,
      "y": 209.02101135253906,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784066610123",
          "name": "プロジェクトID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "",
          "reference": {
            "tableId": "table_1784066570927",
            "columnId": "col_1784066570927"
          }
        },
        {
          "id": "col_1784066628256",
          "name": "案件ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784066634965",
          "name": "案件名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784071669717",
          "name": "開始日",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784071669953",
          "name": "終了日",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_8tsfi",
          "col_1784066610123": "PJ001",
          "col_1784066628256": "AJ001",
          "col_1784066634965": "案件1: Ａソフト開発支援",
          "col_1784071669717": "2026-08-15",
          "col_1784071669953": "2026-11-15"
        },
        {
          "id": "row_ai_1784322502829_56b1c",
          "col_1784066610123": "PJ001",
          "col_1784066628256": "AJ002",
          "col_1784066634965": "案件2: Ｂエンジニアリング開発支援",
          "col_1784071669717": "2026-09-13",
          "col_1784071669953": "2026-10-31"
        }
      ],
      "orderBy": {
        "type": "",
        "uqId": "",
        "direction": "ASC",
        "keys": []
      }
    },
    {
      "id": "table_1784071225178",
      "name": "発注",
      "x": 266.1479797363281,
      "y": 1210.5834503173828,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784071225178",
          "name": "注文ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784071261870",
          "name": "作業契約ID",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784066301594",
            "columnId": "col_1784071378702"
          }
        },
        {
          "id": "col_1784155455972",
          "name": "発注先ID",
          "type": "FK:table_1784072609051",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "reference": {
            "tableId": "table_1784072609051",
            "columnId": "col_1784072609051"
          },
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784071562675",
          "name": "年月",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "- YYYY-MM-01形式。\n- `作業契約ID` で紐づく `案件作業明細` の `開始日` から `終了日` までの期間と重なる期間があること。"
        },
        {
          "id": "col_1784071520281",
          "name": "合計工数",
          "type": "DECIMAL",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`注文ID` で紐づく `注文明細` の `発注工数` の合計を設定。",
          "isVisible": true
        },
        {
          "id": "col_1784071521812",
          "name": "合計発注額",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`注文ID` で紐づく `注文明細` の `発注額` を合計を設定。",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_qm1po",
          "col_1784071225178": "ORD001",
          "col_1784071261870": "WK001",
          "col_1784155455972": "BP001",
          "col_1784071562675": "2026-08-01",
          "col_1784071520281": "1.3",
          "col_1784071521812": "1150000"
        },
        {
          "id": "row_ai_1784322502829_j6qlw",
          "col_1784071225178": "ORD002",
          "col_1784071261870": "WK001",
          "col_1784155455972": "BP001",
          "col_1784071562675": "2026-09-01",
          "col_1784071520281": "1.3",
          "col_1784071521812": "1150000"
        },
        {
          "id": "row_ai_1784322502829_2jcjt",
          "col_1784071225178": "ORD003",
          "col_1784071261870": "WK002",
          "col_1784155455972": "BP001",
          "col_1784071562675": "2026-10-01",
          "col_1784071520281": "1.3",
          "col_1784071521812": "1150000"
        },
        {
          "id": "row_ai_1784322502829_mah1g",
          "col_1784071225178": "ORD004",
          "col_1784071261870": "WK002",
          "col_1784155455972": "BP001",
          "col_1784071562675": "2026-11-01",
          "col_1784071520281": "1.3",
          "col_1784071521812": "1150000"
        },
        {
          "id": "row_ai_1784322502829_vav1c",
          "col_1784071225178": "ORD005",
          "col_1784071261870": "WK003",
          "col_1784155455972": "BP002",
          "col_1784071562675": "2026-09-01",
          "col_1784071520281": "1.6",
          "col_1784071521812": "1210000"
        },
        {
          "id": "row_ai_1784322502829_n49uq",
          "col_1784071225178": "ORD006",
          "col_1784071261870": "WK004",
          "col_1784155455972": "BP002",
          "col_1784071562675": "2026-10-01",
          "col_1784071520281": "1.6",
          "col_1784071521812": "1210000"
        }
      ],
      "uniqueKeys": [
        {
          "id": "uq_1784385947032",
          "columnIds": [
            "col_1784071261870",
            "col_1784155455972",
            "col_1784071562675"
          ]
        }
      ]
    },
    {
      "id": "table_1784071732430",
      "name": "月別案件社員工数",
      "x": 349.19366455078125,
      "y": 1970.317626953125,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784071732430",
          "name": "作業契約ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784066301594",
            "columnId": "col_1784071378702"
          }
        },
        {
          "id": "col_1784071766155",
          "name": "社員ID",
          "type": "FK:table_1784072120643",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784072183956",
            "columnId": "col_1784072183956"
          }
        },
        {
          "id": "col_1784071787705",
          "name": "年月",
          "type": "DATE",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784072183956",
            "columnId": "col_1784072234096"
          },
          "description": "YYYY-MM-01形式。"
        },
        {
          "id": "col_1784071808483",
          "name": "作業時間",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "- 基本的に1人月は160時間。\n- 0以上200以下の値を取る。"
        },
        {
          "id": "col_1784160616191",
          "name": "加工費",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`社員ID` で紐づく `社員` テーブルの `単価` × `作業時間` を設定。",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_otexx",
          "col_1784071732430": "WK001",
          "col_1784071766155": "EMP001",
          "col_1784071787705": "2026-08-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1440000"
        },
        {
          "id": "row_ai_1784322502829_vcgqu",
          "col_1784071732430": "WK001",
          "col_1784071766155": "EMP001",
          "col_1784071787705": "2026-09-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1440000"
        },
        {
          "id": "row_ai_1784322502829_v9my3",
          "col_1784071732430": "WK002",
          "col_1784071766155": "EMP001",
          "col_1784071787705": "2026-10-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1440000"
        },
        {
          "id": "row_ai_1784322502829_9xvcf",
          "col_1784071732430": "WK002",
          "col_1784071766155": "EMP001",
          "col_1784071787705": "2026-11-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1440000"
        },
        {
          "id": "row_ai_1784322502829_soc3n",
          "col_1784071732430": "WK003",
          "col_1784071766155": "EMP002",
          "col_1784071787705": "2026-09-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1280000"
        },
        {
          "id": "row_ai_1784322502829_936ng",
          "col_1784071732430": "WK004",
          "col_1784071766155": "EMP002",
          "col_1784071787705": "2026-10-01",
          "col_1784071808483": "160",
          "col_1784160616191": "1280000"
        }
      ]
    },
    {
      "id": "table_1784072120643",
      "name": "社員",
      "x": 49.0625,
      "y": 450,
      "isMinimized": false,
      "viewPane": "sub",
      "columns": [
        {
          "id": "col_1784072120643",
          "name": "社員ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "形式：EMPnnn\n- EMP は固定文字列\n- nnn は001から始まる連番"
        },
        {
          "id": "col_1784072144740",
          "name": "社員名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784160567424",
          "name": "単価",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "時間単位の金額。"
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_mma7a",
          "col_1784072120643": "EMP001",
          "col_1784072144740": "トム・デマルコ",
          "col_1784160567424": "9000"
        },
        {
          "id": "row_ai_1784322502829_5wk5j",
          "col_1784072120643": "EMP002",
          "col_1784072144740": "ロバート・マーチン",
          "col_1784160567424": "8000"
        },
        {
          "id": "row_ai_1784322502829_g3juk",
          "col_1784072120643": "EMP003",
          "col_1784072144740": "マーチン・ファウラー",
          "col_1784160567424": "10000"
        }
      ]
    },
    {
      "id": "table_1784072183956",
      "name": "月別社員工数サマリ",
      "x": 266.6264343261719,
      "y": 1702.7905578613281,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784072183956",
          "name": "社員ID",
          "type": "FK:table_1784072120643",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "reference": {
            "tableId": "table_1784072120643",
            "columnId": "col_1784072120643"
          },
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784072234096",
          "name": "年月",
          "type": "DATE",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "YYYY-MM-01形式。"
        },
        {
          "id": "col_1784072245321",
          "name": "作業時間",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`社員ID` と `年月` で紐づく `月別案件社員工数` テーブルの `作業時間` の合計を設定。",
          "isVisible": true,
          "description": "1人月は160時間。\n0以上200以下の値を設定。"
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_167dz",
          "col_1784072183956": "EMP001",
          "col_1784072234096": "2026-08-01",
          "col_1784072245321": "160"
        },
        {
          "id": "row_ai_1784322502829_hb65c",
          "col_1784072183956": "EMP001",
          "col_1784072234096": "2026-09-01",
          "col_1784072245321": "160"
        },
        {
          "id": "row_ai_1784322502829_zdhxu",
          "col_1784072183956": "EMP001",
          "col_1784072234096": "2026-10-01",
          "col_1784072245321": "160"
        },
        {
          "id": "row_ai_1784322502829_q1e3j",
          "col_1784072183956": "EMP001",
          "col_1784072234096": "2026-11-01",
          "col_1784072245321": "160"
        },
        {
          "id": "row_ai_1784322502829_zj034",
          "col_1784072183956": "EMP002",
          "col_1784072234096": "2026-09-01",
          "col_1784072245321": "160"
        },
        {
          "id": "row_ai_1784322502829_mffet",
          "col_1784072183956": "EMP002",
          "col_1784072234096": "2026-10-01",
          "col_1784072245321": "160"
        }
      ]
    },
    {
      "id": "table_1784072609051",
      "name": "発注先",
      "x": 46,
      "y": 78,
      "isMinimized": false,
      "viewPane": "sub",
      "columns": [
        {
          "id": "col_1784072609051",
          "name": "発注先ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "形式：BPnnn\n- BP は固定文字列\n- nnn は001から始まる連番"
        },
        {
          "id": "col_1784072649625",
          "name": "発注先名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_izg8j",
          "col_1784072609051": "BP001",
          "col_1784072649625": "Ａソフトウェア"
        },
        {
          "id": "row_ai_1784322502829_0hfog",
          "col_1784072609051": "BP002",
          "col_1784072649625": "Ｂエンジニアリング"
        }
      ],
      "uniqueKeys": [
        {
          "id": "uq_1784350854258",
          "columnIds": [
            "col_1784072649625"
          ]
        }
      ]
    },
    {
      "id": "table_1784072688154",
      "name": "要員",
      "x": 185.0625,
      "y": 242,
      "isMinimized": false,
      "viewPane": "sub",
      "columns": [
        {
          "id": "col_1784072718444",
          "name": "要員ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "形式：MEMnnn\n- MEM は固定文字列\n- nnn は001から始まる連番"
        },
        {
          "id": "col_1784072688154",
          "name": "所属会社ID",
          "type": "FK:table_1784072609051",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784072609051",
            "columnId": "col_1784072609051"
          }
        },
        {
          "id": "col_1784072724920",
          "name": "氏名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784118895896",
          "name": "単価",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "月単位の金額。"
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_1321k",
          "col_1784072718444": "MEM001",
          "col_1784072688154": "BP001",
          "col_1784072724920": "坂本龍馬",
          "col_1784118895896": "1000000"
        },
        {
          "id": "row_ai_1784322502829_7d3zl",
          "col_1784072718444": "MEM002",
          "col_1784072688154": "BP001",
          "col_1784072724920": "高杉晋作",
          "col_1784118895896": "700000"
        },
        {
          "id": "row_ai_1784322502829_edisu",
          "col_1784072718444": "MEM003",
          "col_1784072688154": "BP002",
          "col_1784072724920": "西郷隆盛",
          "col_1784118895896": "850000"
        },
        {
          "id": "row_ai_1784322502829_3kpiz",
          "col_1784072718444": "MEM004",
          "col_1784072688154": "BP002",
          "col_1784072724920": "勝海舟",
          "col_1784118895896": "600000"
        }
      ]
    },
    {
      "id": "table_1784072777767",
      "name": "月別要員工数サマリ",
      "x": 266.2201843261719,
      "y": 368.7073211669922,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784072833568",
          "name": "要員ID",
          "type": "FK:table_1784072688154",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "reference": {
            "tableId": "table_1784072688154",
            "columnId": "col_1784072718444"
          },
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784072847526",
          "name": "年月",
          "type": "DATE",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "YYYY-MM-01形式。"
        },
        {
          "id": "col_1784072861407",
          "name": "合計工数",
          "type": "DECIMAL",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`要員ID` と `年月` で紐づく `注文明細` テーブルの `発注工数` の合計を設定。",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_ukwxq",
          "col_1784072833568": "MEM001",
          "col_1784072847526": "2026-08-01",
          "col_1784072861407": "0.8"
        },
        {
          "id": "row_ai_1784322502829_1ksv3",
          "col_1784072833568": "MEM001",
          "col_1784072847526": "2026-09-01",
          "col_1784072861407": "0.8"
        },
        {
          "id": "row_ai_1784322502829_sp64n",
          "col_1784072833568": "MEM001",
          "col_1784072847526": "2026-10-01",
          "col_1784072861407": "0.8"
        },
        {
          "id": "row_ai_1784322502829_zfusl",
          "col_1784072833568": "MEM001",
          "col_1784072847526": "2026-11-01",
          "col_1784072861407": "0.8"
        },
        {
          "id": "row_ai_1784322502829_vycef",
          "col_1784072833568": "MEM002",
          "col_1784072847526": "2026-08-01",
          "col_1784072861407": "0.5"
        },
        {
          "id": "row_ai_1784322502829_oo24e",
          "col_1784072833568": "MEM002",
          "col_1784072847526": "2026-09-01",
          "col_1784072861407": "0.5"
        },
        {
          "id": "row_ai_1784322502829_8cw74",
          "col_1784072833568": "MEM002",
          "col_1784072847526": "2026-10-01",
          "col_1784072861407": "0.5"
        },
        {
          "id": "row_ai_1784322502829_zfwpp",
          "col_1784072833568": "MEM002",
          "col_1784072847526": "2026-11-01",
          "col_1784072861407": "0.5"
        },
        {
          "id": "row_ai_1784322502829_bandk",
          "col_1784072833568": "MEM003",
          "col_1784072847526": "2026-09-01",
          "col_1784072861407": "1.0"
        },
        {
          "id": "row_ai_1784322502829_pm5bn",
          "col_1784072833568": "MEM003",
          "col_1784072847526": "2026-10-01",
          "col_1784072861407": "1.0"
        },
        {
          "id": "row_ai_1784322502829_iffij",
          "col_1784072833568": "MEM004",
          "col_1784072847526": "2026-09-01",
          "col_1784072861407": "0.6"
        },
        {
          "id": "row_ai_1784322502829_7omuy",
          "col_1784072833568": "MEM004",
          "col_1784072847526": "2026-10-01",
          "col_1784072861407": "0.6"
        }
      ],
      "uniqueKeys": []
    },
    {
      "id": "table_1784119020695",
      "name": "注文明細",
      "x": 344.70648193359375,
      "y": 789.7241439819336,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784119020695",
          "name": "注文ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784071225178",
            "columnId": "col_1784071225178"
          }
        },
        {
          "id": "col_1784119102944",
          "name": "要員ID",
          "type": "FK:table_1784072688154",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784072777767",
            "columnId": "col_1784072833568"
          },
          "description": "下記2項目の値が等しい必要がある。\n- `要員ID` で紐づく `要員` テーブルのレコードの `所属会社ID`\n- `注文ID` で紐づく `発注` テーブルのレコードの `発注先ID`"
        },
        {
          "id": "col_1784155687527",
          "name": "発注工数",
          "type": "DECIMAL",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "description": "- 単位は人月。\n- 0以上1以下の値を取る。\n- 小数点以下の桁数は1桁。"
        },
        {
          "id": "col_1784155687999",
          "name": "発注単価",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`要員ID` で紐づく `要員` テーブルの `単価` を設定。",
          "isVisible": true
        },
        {
          "id": "col_1784156123034",
          "name": "年月",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "dependent",
          "derivation": "`注文ID` で紐づく `発注` の `年月` を設定。",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784072777767",
            "columnId": "col_1784072847526"
          }
        },
        {
          "id": "col_1784155629683",
          "name": "発注先ID",
          "type": "FK:table_1784072609051",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "reference": {
            "tableId": "table_1784072609051",
            "columnId": "col_1784072609051"
          },
          "attributeType": "dependent",
          "derivation": "`注文ID` で紐づく `発注` の `発注先ID` を設定。",
          "isVisible": true
        },
        {
          "id": "col_1784158349788",
          "name": "発注額",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "`発注工数` × `発注単価` を設定。",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_cgm1u",
          "col_1784119020695": "ORD001",
          "col_1784119102944": "MEM001",
          "col_1784155687527": "0.8",
          "col_1784155687999": "1000000",
          "col_1784156123034": "2026-08-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "800000"
        },
        {
          "id": "row_ai_1784322502829_5z4jd",
          "col_1784119020695": "ORD001",
          "col_1784119102944": "MEM002",
          "col_1784155687527": "0.5",
          "col_1784155687999": "700000",
          "col_1784156123034": "2026-08-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "350000"
        },
        {
          "id": "row_ai_1784322502829_ci9ta",
          "col_1784119020695": "ORD002",
          "col_1784119102944": "MEM001",
          "col_1784155687527": "0.8",
          "col_1784155687999": "1000000",
          "col_1784156123034": "2026-09-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "800000"
        },
        {
          "id": "row_ai_1784322502829_dmcj3",
          "col_1784119020695": "ORD002",
          "col_1784119102944": "MEM002",
          "col_1784155687527": "0.5",
          "col_1784155687999": "700000",
          "col_1784156123034": "2026-09-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "350000"
        },
        {
          "id": "row_ai_1784322502829_5zrsy",
          "col_1784119020695": "ORD003",
          "col_1784119102944": "MEM001",
          "col_1784155687527": "0.8",
          "col_1784155687999": "1000000",
          "col_1784156123034": "2026-10-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "800000"
        },
        {
          "id": "row_ai_1784322502829_bg1i6",
          "col_1784119020695": "ORD003",
          "col_1784119102944": "MEM002",
          "col_1784155687527": "0.5",
          "col_1784155687999": "700000",
          "col_1784156123034": "2026-10-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "350000"
        },
        {
          "id": "row_ai_1784322502829_hdrqp",
          "col_1784119020695": "ORD004",
          "col_1784119102944": "MEM001",
          "col_1784155687527": "0.8",
          "col_1784155687999": "1000000",
          "col_1784156123034": "2026-11-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "800000"
        },
        {
          "id": "row_ai_1784322502829_p7xs6",
          "col_1784119020695": "ORD004",
          "col_1784119102944": "MEM002",
          "col_1784155687527": "0.5",
          "col_1784155687999": "700000",
          "col_1784156123034": "2026-11-01",
          "col_1784155629683": "BP001",
          "col_1784158349788": "350000"
        },
        {
          "id": "row_ai_1784322502829_sizbw",
          "col_1784119020695": "ORD005",
          "col_1784119102944": "MEM003",
          "col_1784155687527": "1.0",
          "col_1784155687999": "850000",
          "col_1784156123034": "2026-09-01",
          "col_1784155629683": "BP002",
          "col_1784158349788": "850000"
        },
        {
          "id": "row_ai_1784322502829_ix110",
          "col_1784119020695": "ORD005",
          "col_1784119102944": "MEM004",
          "col_1784155687527": "0.6",
          "col_1784155687999": "600000",
          "col_1784156123034": "2026-09-01",
          "col_1784155629683": "BP002",
          "col_1784158349788": "360000"
        },
        {
          "id": "row_ai_1784322502829_3nhom",
          "col_1784119020695": "ORD006",
          "col_1784119102944": "MEM003",
          "col_1784155687527": "1.0",
          "col_1784155687999": "850000",
          "col_1784156123034": "2026-10-01",
          "col_1784155629683": "BP002",
          "col_1784158349788": "850000"
        },
        {
          "id": "row_ai_1784322502829_nf84i",
          "col_1784119020695": "ORD006",
          "col_1784119102944": "MEM004",
          "col_1784155687527": "0.6",
          "col_1784155687999": "600000",
          "col_1784156123034": "2026-10-01",
          "col_1784155629683": "BP002",
          "col_1784158349788": "360000"
        }
      ],
      "uniqueKeys": []
    },
    {
      "id": "table_1784156565504",
      "name": "その他経費",
      "x": 269,
      "y": 2227.5,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784156565504",
          "name": "作業契約ID",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true,
          "reference": {
            "tableId": "table_1784066301594",
            "columnId": "col_1784071378702"
          }
        },
        {
          "id": "col_1784156612504",
          "name": "行No",
          "type": "INT",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784156622414",
          "name": "金額",
          "type": "INT",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784156627730",
          "name": "摘要",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [
        {
          "id": "row_ai_1784322502829_yxfrg",
          "col_1784156565504": "WK001",
          "col_1784156612504": "1",
          "col_1784156622414": "50000",
          "col_1784156627730": "旅費交通費"
        },
        {
          "id": "row_ai_1784322502829_gmctn",
          "col_1784156565504": "WK001",
          "col_1784156612504": "2",
          "col_1784156622414": "12000",
          "col_1784156627730": "会議費"
        },
        {
          "id": "row_ai_1784322502829_f0crq",
          "col_1784156565504": "WK002",
          "col_1784156612504": "1",
          "col_1784156622414": "35000",
          "col_1784156627730": "消耗品費"
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1784066915697",
      "from": "table_1784066610123",
      "to": "table_1784066301594",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784066628256",
          "childColId": "col_1784066301594"
        },
        {
          "parentColId": "col_1784066610123",
          "childColId": "col_1784066667331"
        }
      ]
    },
    {
      "id": "rel_1784163709990",
      "from": "table_1784066570927",
      "to": "table_1784066610123",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784066570927",
          "childColId": "col_1784066610123"
        }
      ]
    },
    {
      "id": "rel_1784164386949",
      "from": "table_1784066301594",
      "to": "table_1784071225178",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784071378702",
          "childColId": "col_1784071261870"
        }
      ]
    },
    {
      "id": "rel_1784072609051_table_1784071225178_col_1784155455972",
      "from": "table_1784072609051",
      "to": "table_1784071225178",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784072609051",
          "childColId": "col_1784155455972"
        }
      ]
    },
    {
      "id": "rel_1784165609314",
      "from": "table_1784066301594",
      "to": "table_1784071732430",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784071378702",
          "childColId": "col_1784071732430"
        }
      ]
    },
    {
      "id": "rel_1784072421796",
      "from": "table_1784072183956",
      "to": "table_1784071732430",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784072183956",
          "childColId": "col_1784071766155"
        },
        {
          "parentColId": "col_1784072234096",
          "childColId": "col_1784071787705"
        }
      ]
    },
    {
      "id": "rel_1784072120643_table_1784072183956_col_1784072183956",
      "from": "table_1784072120643",
      "to": "table_1784072183956",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784072120643",
          "childColId": "col_1784072183956"
        }
      ]
    },
    {
      "id": "rel_1784072732642",
      "from": "table_1784072609051",
      "to": "table_1784072688154",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784072609051",
          "childColId": "col_1784072688154"
        }
      ]
    },
    {
      "id": "rel_1784072688154_table_1784072777767_col_1784072833568",
      "from": "table_1784072688154",
      "to": "table_1784072777767",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784072718444",
          "childColId": "col_1784072833568"
        }
      ]
    },
    {
      "id": "rel_1784165093576",
      "from": "table_1784071225178",
      "to": "table_1784119020695",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784071225178",
          "childColId": "col_1784119020695"
        }
      ]
    },
    {
      "id": "rel_1784165322286",
      "from": "table_1784072777767",
      "to": "table_1784119020695",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784072833568",
          "childColId": "col_1784119102944"
        },
        {
          "parentColId": "col_1784072847526",
          "childColId": "col_1784156123034"
        }
      ]
    },
    {
      "id": "rel_1784072609051_table_1784119020695_col_1784155629683",
      "from": "table_1784072609051",
      "to": "table_1784119020695",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784072609051",
          "childColId": "col_1784155629683"
        }
      ]
    },
    {
      "id": "rel_1784165789361",
      "from": "table_1784066301594",
      "to": "table_1784156565504",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784071378702",
          "childColId": "col_1784156565504"
        }
      ]
    },
    {
      "id": "rel_1784072688154_table_1784119020695_col_1784119102944",
      "from": "table_1784072688154",
      "to": "table_1784119020695",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784072718444",
          "childColId": "col_1784119102944"
        }
      ]
    },
    {
      "id": "rel_1784072120643_table_1784071732430_col_1784071766155",
      "from": "table_1784072120643",
      "to": "table_1784071732430",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784072120643",
          "childColId": "col_1784071766155"
        }
      ]
    }
  ],
  "valueObjects": [],
  "aggregates": [
    {
      "id": "agg_auto_1784066570929_sd3mtcykt",
      "name": "プロジェクト"
    },
    {
      "id": "agg_auto_1784066610125_et9mc40up",
      "name": "案件"
    },
    {
      "id": "agg_auto_1784071225187_l0drbdm9c",
      "name": "発注"
    },
    {
      "id": "agg_auto_1784071732439_9uvh3any2",
      "name": "月別案件社員工数"
    },
    {
      "id": "agg_auto_1784072120658_p581xzqmg",
      "name": "社員"
    },
    {
      "id": "agg_auto_1784072609063_s7wjntfld",
      "name": "発注先"
    },
    {
      "id": "agg_auto_1784072688171_6xgx674zo",
      "name": "要員"
    },
    {
      "id": "agg_auto_1784072777783_wgrs34a30",
      "name": "月別要員工数サマリ"
    },
    {
      "id": "agg_auto_1784156565506_gs7mdgk16",
      "name": "その他経費"
    },
    {
      "id": "agg_1784326938266",
      "name": "案件作業明細"
    }
  ],
  "aggregateData": {
    "table_1784066301594": {
      "aggregateId": "agg_1784326938266",
      "role": "R"
    },
    "table_1784066570927": {
      "aggregateId": "agg_auto_1784066570929_sd3mtcykt",
      "role": "R"
    },
    "table_1784066610123": {
      "aggregateId": "agg_auto_1784066610125_et9mc40up",
      "role": "R"
    },
    "table_1784071225178": {
      "aggregateId": "agg_auto_1784071225187_l0drbdm9c",
      "role": "R"
    },
    "table_1784071732430": {
      "aggregateId": "agg_auto_1784071732439_9uvh3any2",
      "role": "R"
    },
    "table_1784072120643": {
      "aggregateId": "agg_auto_1784072120658_p581xzqmg",
      "role": "R"
    },
    "table_1784072183956": {
      "aggregateId": "agg_auto_1784071732439_9uvh3any2",
      "role": "M"
    },
    "table_1784072609051": {
      "aggregateId": "agg_auto_1784072609063_s7wjntfld",
      "role": "R"
    },
    "table_1784072688154": {
      "aggregateId": "agg_auto_1784072688171_6xgx674zo",
      "role": "R"
    },
    "table_1784072777767": {
      "aggregateId": "agg_auto_1784072777783_wgrs34a30",
      "role": "R"
    },
    "table_1784119020695": {
      "aggregateId": "agg_auto_1784071225187_l0drbdm9c",
      "role": "M"
    },
    "table_1784156565504": {
      "aggregateId": "agg_auto_1784156565506_gs7mdgk16",
      "role": "R"
    }
  },
  "aggregateTableOrder": [
    "table_1784072120643",
    "table_1784072609051",
    "table_1784072688154",
    "table_1784066570927",
    "table_1784066610123",
    "table_1784066301594",
    "table_1784071225178",
    "table_1784119020695",
    "table_1784071732430",
    "table_1784072183956",
    "table_1784156565504",
    "table_1784072777767"
  ],
  "version": "1.3",
  "exportedAt": "2026-07-19T13:23:42.551Z"
}
SCHEMA_DESIGNER_METADATA_END
-->
