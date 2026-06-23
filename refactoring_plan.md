# DB Architect リファクタリング計画書 (ヘキサゴナルアーキテクチャ移行)

本ドキュメントは、**DB Architect (Schema Designer)** のソースコード構造を、保守性の向上と将来の拡張（サーバー保存や他のLLM API連携など）を見据えて、ヘキサゴナルアーキテクチャ（Ports and Adapters）に再構成するための公式な計画書です。

---

## 1. 再構成後のディレクトリ構成（パターンAベース）

UI層（Inbound）は最初から専用のフォルダ（`react-ui`）に隠蔽して見通しを良くし、インフラ層（Outbound）は無駄な階層化を避けてアダプターごとに1つの `.ts` ファイルとして平置きする方針を採用します。

```text
src/
├── domain/                      # 【ドメイン層】 純粋なビジネスルールとデータ構造（フレームワーク非依存）
│   ├── models/                  # ドメインオブジェクト（状態定義と自己完結ロジック）
│   │   ├── Table.ts             # テーブル、カラムの型と検証ロジック
│   │   ├── Aggregate.ts         # 集約、集約割り当ての型と検証ロジック
│   │   ├── ValueObject.ts       # 値オブジェクトの型定義
│   │   └── Relationship.ts      # リレーションの型定義
│   └── services/                # ドメインサービス（複数モデルにまたがる純粋な計算ロジック）
│       ├── relationshipSync.ts  # リレーションシップとテーブルカラムの同期計算
│       └── layoutAlign.ts       # サブテーブルの自動整列などの位置計算
│
├── application/                 # 【アプリケーション層】 ユースケースのフロー制御（トランザクションや調整）
│   └── services/                # ユースケース具象サービス
│       ├── SchemaService.ts     # テーブル追加/削除、カラム操作などのユースケース手順
│       ├── AggregateService.ts  # 集約の追加/割り当て/整列手順
│       └── AiMockDataService.ts # AIモックデータ生成の手順
│
├── ports/                       # 【ポート層】 六角形の境界（インターフェース定義）
│   ├── inbound/                 # プライマリポート（UIなどの呼び出し元が従うインターフェース）
│   │   ├── SchemaUseCase.ts     # テーブル/カラム操作ユースケースのインターフェース
│   │   ├── AggregateUseCase.ts  # 集約操作ユースケースのインターフェース
│   │   └── AiGenerateUseCase.ts # AI生成ユースケースのインターフェース
│   └── outbound/                # セカンダリポート（インフラなどの呼び出し先が満たすべきインターフェース）
│       ├── ProjectRepository.ts # 自動保存/復元（永続化）の抽象
│       ├── FileExporter.ts      # JSONファイル出力（エクスポート）の抽象
│       └── AiClient.ts          # AI生成APIの抽象
│
├── adapters/                    # 【アダプター層】 技術的詳細（フレームワークやブラウザAPIの具象実装）
│   ├── inbound/                 # プライマリアダプター（入力・UI）
│   │   └── react-ui/            # ★ React UIアダプターとして明示的に独立
│   │       ├── App.tsx          # アプリのルートUIコンポーネント（状態の配信・マウント）
│   │       ├── components/      # UIコンポーネント群
│   │       │   ├── Canvas.tsx
│   │       │   ├── TableNode.tsx
│   │       │   └── modals/
│   │       └── hooks/           # UI特有のブラウザAPI結合ロジック
│   │           └── useDragAndDrop.ts # ドラッグ＆ドロップ状態管理（UI特有の関心事）
│   └── outbound/                # セカンダリアダプター（出力・インフラ）
│       ├── LocalStorageProjectRepository.ts # LocalStorageへの自動保存・ロード実装
│       ├── BrowserFileExporter.ts           # ブラウザAPI（showSaveFilePicker）を用いたJSON書き出し
│       └── GeminiAiClient.ts                # Gemini APIへのHTTPリクエスト送信実装
│
├── constants/                   # 共有定数（初期データテンプレートなど）
│   └── index.ts
├── index.css                    # グローバルスタイル
├── main.tsx                     # エントリポイント
└── vite-env.d.ts
```

---

## 2. 既存ファイルの移行マッピング

既存のファイルを新しいディレクトリ構造のどこに移行・分割するかを示します。

| 既存ファイル | 移行先 / 分割先 | 移行時の役割の変化 |
| :--- | :--- | :--- |
| `src/types/index.ts` | ➔ `src/domain/models/*` | interface定義だけでなく、データ整合性チェックなどの純粋関数も同フォルダのファイルに内包。 |
| `src/hooks/useSchemaState.ts` | ➔ `src/application/services/SchemaService.ts`<br>➔ `src/ports/inbound/SchemaUseCase.ts` | React Hooks から純粋なTypeScriptクラス/サービスに移植し、React のライフサイクルから切り離します。 |
| `src/hooks/useAggregateState.ts` | ➔ `src/application/services/AggregateService.ts`<br>➔ `src/ports/inbound/AggregateUseCase.ts` | 同上。集約関連の操作手順をユースケースとして再定義。 |
| `src/hooks/useDragAndDrop.ts` | ➔ `src/adapters/inbound/react-ui/hooks/useDragAndDrop.ts` | これは座標系やDOMイベントを扱うUI限定のロジックであるため、UIアダプターの配下に留めます。 |
| `src/utils/aiDataGenerator.ts` | ➔ `src/adapters/outbound/GeminiAiClient.ts` | Gemini API とのHTTP通信を担当する出力アダプターとしてカプセル化。 |
| `src/utils/relationshipUtils.ts`<br>`src/utils/schemaUtils.ts` | ➔ `src/domain/services/*` | 特定のフレームワークやI/Oに依存しない純粋なリレーション計算、カラム抽出ロジックとしてドメインサービスに位置づけ。 |
| `src/utils/layoutUtils.ts` | ➔ `src/adapters/inbound/react-ui/utils/layoutUtils.ts`<br>(または `src/domain/services/`) | DOMサイズ取得などに依存する部分はUIアダプター、純粋な配置座標計算はドメインサービスに分割します。 |
| `src/components/*` | ➔ `src/adapters/inbound/react-ui/components/*` | UIコンポーネントはすべて入力アダプターに分類されます。 |
| `src/App.tsx` | ➔ `src/adapters/inbound/react-ui/App.tsx` | LocalStorage への保存処理や AI 呼び出しロジックを取り除き、純粋な「画面全体のレイアウトとダイアログ制御、ユースケース呼び出し」のみに縮小。 |

---

## 3. 主要な設計上の決定事項（ADR）

### ① UI層（インバウンド）の `react-ui` によるカプセル化
*   **決定**: `adapters/inbound/` 配下に直接コンポーネントを置くのではなく、`react-ui/` フォルダを1つ挟む構成を採用しました。
*   **理由**: 将来的に別のインバウンドアダプター（例: 外部からの Web API や CLI ツールなど）が増えた場合に、React のソースファイルと混ざらず対称性の良い構成（`react-ui/` と `web-api/` が並列になる）を維持し、見通しを良くするためです。

### ② 自動保存（LocalStorage）とファイル出力（JSONエクスポート）のポート分離
*   **決定**: 自動保存用のポート（`ProjectRepository`）と、ファイル出力用のポート（`FileExporter`）を明確に別個のインターフェースとして定義します。
*   **理由**:
    - **単一責任の原則 (SRP)** に基づき、ユーザーの意思によるエクスポート（ダイアログを開く対話的な処理）と、システムの裏で動く自動保存（サイレントなキャッシュ処理）は異なるユースケースであるため。
    - 将来的に「自動保存先をサーバーのデータベースに変更しつつ、エクスポートはブラウザからのダウンロードのままにする」といった差し替えを最小限の影響範囲で行うため。

### ③ アウトバウンドアダプターの平置き配置
*   **決定**: `adapters/outbound/` 配下には、`local-storage/` などのテクノロジーごとのフォルダは作成せず、アダプターごとに独立した1つの `.ts` ファイル（例: `LocalStorageProjectRepository.ts`, `GeminiAiClient.ts`）として直接平置きします。
*   **理由**: 各アウトバウンドアダプターの実装は1ファイルで完結するシンプルなものであるため、フォルダでさらに包むと階層が過剰に深くなるのを防ぐためです。
