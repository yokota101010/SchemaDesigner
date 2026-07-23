# 組織モデル - 仕様書 (Database & Domain Schema)

> [!NOTE]
> この仕様書は DB Architect (Schema Designer) から自動出力されました。
> 出力日時: 2026/7/24 7:47:11

## 1. ドメイン集約 (Domain Aggregates)

トランザクションの整合性を保つ境界となる集約の定義です。

### 集約: 作業契約
- (所属するテーブルはありません)

### 集約: プロジェクト
- (所属するテーブルはありません)

### 集約: 案件
- (所属するテーブルはありません)

### 集約: 発注
- (所属するテーブルはありません)

### 集約: 加工費
- (所属するテーブルはありません)

### 集約: 社員
- (所属するテーブルはありません)

### 集約: 月別社員作業量
- (所属するテーブルはありません)

### 集約: 発注先
- (所属するテーブルはありません)

### 集約: 発注先要員
- (所属するテーブルはありません)

### 集約: 月別要員工数
- (所属するテーブルはありません)

### 集約: 部門
- 👑 **集約ルート (Aggregate Root)**: `部門`

### 集約: 階層変更履歴
- 👑 **集約ルート (Aggregate Root)**: `階層変更履歴`

### 集約: 統廃合履歴
- 👑 **集約ルート (Aggregate Root)**: `統廃合履歴`

### 集約: new_table
- (所属するテーブルはありません)

### 集約: 変遷種別
- (所属するテーブルはありません)

### 集約: 組織改編履歴
- 👑 **集約ルート (Aggregate Root)**: `組織改編履歴`

### 集約: 改変種別
- 👑 **集約ルート (Aggregate Root)**: `改変種別`

### 集約: new_table
- (所属するテーブルはありません)

### 集約: new_table
- (所属するテーブルはありません)

### 集約: 親
- (所属するテーブルはありません)

### 集約: 子
- (所属するテーブルはありません)

## 2. 値オブジェクト定義 (Value Objects)

ドメインモデルで再利用されるデータの型とビジネスルールです。

### `Money`
**ビジネスルール・制約条件**:
金額(amount)は0以上の正の数。ただし通貨(currency)が'JPY'の場合は正の整数のみ許容し、'USD'の場合は小数点以下2桁まで許容する。

**プロパティ構成**:

| プロパティ名 | データ型 | 説明 |
| :--- | :--- | :--- |
| `amount` | `DECIMAL` | 金額数値 |
| `currency` | `VARCHAR(255)` | 通貨コード |

### `Address`
**ビジネスルール・制約条件**:
郵便番号(postalCode)は7桁ハイフンなしの数字。都道府県(state)は47都道府県名であること。

**プロパティ構成**:

| プロパティ名 | データ型 | 説明 |
| :--- | :--- | :--- |
| `postalCode` | `VARCHAR(255)` | 郵便番号 |
| `state` | `VARCHAR(255)` | 都道府県 |
| `city` | `VARCHAR(255)` | 市区町村 |
| `line1` | `VARCHAR(255)` | 住所番地 |

## 3. テーブル定義 (Tables & Columns)

データベースの各テーブル定義およびビジネスルールです。

### テーブル: `部門`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `部門C` | `VARCHAR(255)` | ✅ |  |  | 独立 |  |
| `部門名` | `VARCHAR(255)` |  |  |  | 独立 |  |
| `開始日` | `DATE` |  |  |  | 独立 |  |
| `終了日` | `DATE` |  |  |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

* ※ テストデータは生成されていません。

---

### テーブル: `階層変更履歴`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `改編日` | `VARCHAR(255)` | ✅ | ✅ (`組織改編履歴.改編日`) | ✅ (UQ1) | 独立 |  |
| `行No` | `VARCHAR(255)` | ✅ | ✅ (`組織改編履歴.行No`) |  | 独立 |  |
| `部門C` | `VARCHAR(255)` |  | ✅ (`部門.部門C`) | ✅ (UQ1) | 独立 |  |
| `親部門C` | `VARCHAR(255)` |  | ✅ (`部門.部門C`) |  | 独立 |  |
| `終了年月` | `DATE` |  |  |  | 導出項目 |  |

#### AI検証用テストデータ (Seed Data)

* ※ テストデータは生成されていません。

---

### テーブル: `統廃合履歴`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `改編日` | `VARCHAR(255)` | ✅ | ✅ (`組織改編履歴.改編日`) |  | 独立 |  |
| `行No` | `VARCHAR(255)` | ✅ | ✅ (`組織改編履歴.行No`) |  | 独立 |  |
| `後継部門C` | `VARCHAR(255)` |  | ✅ (`部門.部門C`) |  | 独立 |  |
| `前身部門C` | `VARCHAR(255)` |  | ✅ (`部門.部門C`) |  | 独立 |  |
| `その他属性` | `VARCHAR(255)` |  |  |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

* ※ テストデータは生成されていません。

---

### テーブル: `組織改編履歴`
* ビュー分類:  (メインビュー)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `改編日` | `DATE` | ✅ |  |  | 独立 |  |
| `行No` | `INT` | ✅ |  |  | 独立 |  |
| `改編種別ID` | `BIGINT` |  | ✅ (`改変種別.改変種別ID`) |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

* ※ テストデータは生成されていません。

---

### テーブル: `改変種別`
* ビュー分類:  (サブビュー / マスタ等)

#### スキーマ定義

| カラム名 (物理) | データ型 | PK | FK | UQ | 区分 | カラム定義・ビジネスルール |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `改変種別ID` | `BIGINT` | ✅ |  |  | 独立 |  |
| `説明` | `VARCHAR(255)` |  |  |  | 独立 |  |

#### AI検証用テストデータ (Seed Data)

| 改変種別ID | 説明 |
| --- | --- |
| Reparenting | 階層変更 |
| Consolidation | 統廃合 |

---

<!-- 
[SYSTEM METADATA - DO NOT USE FOR IMPLEMENTATION CODE GENERATION]
The following JSON is only used by DB Architect (Schema Designer) to restore the UI layout and state.
SCHEMA_DESIGNER_METADATA_START
{
  "name": "組織モデル",
  "tables": [
    {
      "id": "table_1784764437391",
      "name": "部門",
      "x": 57.295501708984375,
      "y": 69.76646041870117,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784764437391",
          "name": "部門C",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784764459893",
          "name": "部門名",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784764467898",
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
          "id": "col_1784764475007",
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
      "rows": []
    },
    {
      "id": "table_1784764518995",
      "name": "階層変更履歴",
      "x": 204.12884521484375,
      "y": 309.8625183105469,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784815641535",
          "name": "改編日",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784815642118",
          "name": "行No",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784764518995",
          "name": "部門C",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784764556033",
          "name": "親部門C",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784764547591",
          "name": "終了年月",
          "type": "DATE",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "dependent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [],
      "uniqueKeys": [
        {
          "id": "uq_1784815666330",
          "columnIds": [
            "col_1784764518995",
            "col_1784815641535"
          ]
        }
      ]
    },
    {
      "id": "table_1784813202059",
      "name": "統廃合履歴",
      "x": 207.9159393310547,
      "y": 428.4331741333008,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784815428762",
          "name": "改編日",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784815431310",
          "name": "行No",
          "type": "VARCHAR(255)",
          "isPk": true,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784813319964",
          "name": "後継部門C",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784813301281",
          "name": "前身部門C",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784813378224",
          "name": "その他属性",
          "type": "VARCHAR(255)",
          "isPk": false,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": [],
      "uniqueKeys": []
    },
    {
      "id": "table_1784815204794",
      "name": "組織改編履歴",
      "x": 207.39703369140625,
      "y": 188.9420166015625,
      "isMinimized": false,
      "viewPane": "main",
      "columns": [
        {
          "id": "col_1784815204794",
          "name": "改編日",
          "type": "DATE",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784815282543",
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
          "id": "col_1784815294602",
          "name": "改編種別ID",
          "type": "FK:table_1784844164706",
          "isPk": false,
          "isUnique": false,
          "isFk": true,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        }
      ],
      "rows": []
    },
    {
      "id": "table_1784844164706",
      "name": "改変種別",
      "x": 26,
      "y": 71.5,
      "isMinimized": false,
      "viewPane": "sub",
      "columns": [
        {
          "id": "col_1784844164706",
          "name": "改変種別ID",
          "type": "BIGINT",
          "isPk": true,
          "isUnique": false,
          "isFk": false,
          "attributeType": "independent",
          "derivation": "",
          "isVisible": true
        },
        {
          "id": "col_1784844198930",
          "name": "説明",
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
          "id": "row_1784844232827",
          "col_1784844164706": "Reparenting",
          "col_1784844198930": "階層変更"
        },
        {
          "id": "row_1784844266751",
          "col_1784844164706": "Consolidation",
          "col_1784844198930": "統廃合"
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel_1784813580588",
      "from": "table_1784764437391",
      "to": "table_1784813202059",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784764437391",
          "childColId": "col_1784813319964"
        }
      ]
    },
    {
      "id": "rel_1784813590772",
      "from": "table_1784764437391",
      "to": "table_1784813202059",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784764437391",
          "childColId": "col_1784813301281"
        }
      ]
    },
    {
      "id": "rel_1784815589823",
      "from": "table_1784815204794",
      "to": "table_1784813202059",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784815204794",
          "childColId": "col_1784815428762"
        },
        {
          "parentColId": "col_1784815282543",
          "childColId": "col_1784815431310"
        }
      ]
    },
    {
      "id": "rel_1784843294869",
      "from": "table_1784815204794",
      "to": "table_1784764518995",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784815204794",
          "childColId": "col_1784815641535"
        },
        {
          "parentColId": "col_1784815282543",
          "childColId": "col_1784815642118"
        }
      ]
    },
    {
      "id": "rel_table_1784844164706_table_1784815204794_col_1784815294602",
      "from": "table_1784844164706",
      "to": "table_1784815204794",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784844164706",
          "childColId": "col_1784815294602"
        }
      ]
    },
    {
      "id": "rel_1784844716195",
      "from": "table_1784764437391",
      "to": "table_1784764518995",
      "type": "identifying",
      "mappings": [
        {
          "parentColId": "col_1784764437391",
          "childColId": "col_1784764518995"
        }
      ]
    },
    {
      "id": "rel_1784844883438",
      "from": "table_1784764437391",
      "to": "table_1784764518995",
      "type": "non_identifying",
      "mappings": [
        {
          "parentColId": "col_1784764437391",
          "childColId": "col_1784764556033"
        }
      ]
    }
  ],
  "valueObjects": [
    {
      "name": "Money",
      "description": "金額(amount)は0以上の正の数。ただし通貨(currency)が'JPY'の場合は正の整数のみ許容し、'USD'の場合は小数点以下2桁まで許容する。",
      "properties": [
        {
          "name": "amount",
          "type": "DECIMAL",
          "description": "金額数値"
        },
        {
          "name": "currency",
          "type": "VARCHAR(255)",
          "description": "通貨コード"
        }
      ]
    },
    {
      "name": "Address",
      "description": "郵便番号(postalCode)は7桁ハイフンなしの数字。都道府県(state)は47都道府県名であること。",
      "properties": [
        {
          "name": "postalCode",
          "type": "VARCHAR(255)",
          "description": "郵便番号"
        },
        {
          "name": "state",
          "type": "VARCHAR(255)",
          "description": "都道府県"
        },
        {
          "name": "city",
          "type": "VARCHAR(255)",
          "description": "市区町村"
        },
        {
          "name": "line1",
          "type": "VARCHAR(255)",
          "description": "住所番地"
        }
      ]
    }
  ],
  "aggregates": [
    {
      "id": "agg_auto_1784066301597_gba01tq0c",
      "name": "作業契約"
    },
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
      "name": "加工費"
    },
    {
      "id": "agg_auto_1784072120658_p581xzqmg",
      "name": "社員"
    },
    {
      "id": "agg_auto_1784072183965_brw7i9cmw",
      "name": "月別社員作業量"
    },
    {
      "id": "agg_auto_1784072609063_s7wjntfld",
      "name": "発注先"
    },
    {
      "id": "agg_auto_1784072688171_6xgx674zo",
      "name": "発注先要員"
    },
    {
      "id": "agg_auto_1784072777783_wgrs34a30",
      "name": "月別要員工数"
    },
    {
      "id": "agg_auto_1784764437400_hltp396w8",
      "name": "部門"
    },
    {
      "id": "agg_auto_1784764519003_84118p6eg",
      "name": "階層変更履歴"
    },
    {
      "id": "agg_auto_1784813202065_2dfit62gk",
      "name": "統廃合履歴"
    },
    {
      "id": "agg_auto_1784813670900_vdi2bsshi",
      "name": "new_table"
    },
    {
      "id": "agg_auto_1784813672463_sxpmoj817",
      "name": "変遷種別"
    },
    {
      "id": "agg_auto_1784815204803_ji2z76xf9",
      "name": "組織改編履歴"
    },
    {
      "id": "agg_auto_1784844164707_6whn1ncel",
      "name": "改変種別"
    },
    {
      "id": "agg_auto_1784844949524_rtx978ro4",
      "name": "new_table"
    },
    {
      "id": "agg_auto_1784844952991_xhe6w6w6y",
      "name": "new_table"
    },
    {
      "id": "agg_auto_1784844955703_gkref0e4c",
      "name": "親"
    },
    {
      "id": "agg_auto_1784844998384_u5bv6gpiv",
      "name": "子"
    }
  ],
  "aggregateData": {
    "table_1784764437391": {
      "aggregateId": "agg_auto_1784764437400_hltp396w8",
      "role": "R"
    },
    "table_1784764518995": {
      "aggregateId": "agg_auto_1784764519003_84118p6eg",
      "role": "R"
    },
    "table_1784813202059": {
      "aggregateId": "agg_auto_1784813202065_2dfit62gk",
      "role": "R"
    },
    "table_1784815204794": {
      "aggregateId": "agg_auto_1784815204803_ji2z76xf9",
      "role": "R"
    },
    "table_1784844164706": {
      "aggregateId": "agg_auto_1784844164707_6whn1ncel",
      "role": "R"
    }
  },
  "aggregateTableOrder": [
    "table_1784764437391",
    "table_1784764518995",
    "table_1784813202059",
    "table_1784815204794",
    "table_1784844164706"
  ],
  "version": "1.3",
  "exportedAt": "2026-07-23T22:47:11.043Z"
}
SCHEMA_DESIGNER_METADATA_END
-->
