# DB Architect (Schema Designer)

ブラウザ上で動作するスキーマ設計・データベース設計ツールです。
React + Vite + Tailwind CSS を使用して構築されており、最終的に「1つのHTMLファイル」として出力できる構成になっています。

## ディレクトリ構成

```text
/
├── index.html          # 開発時用のエントリポイント（直接ブラウザで開かないこと）
├── package.json        # パッケージ管理とスクリプト
├── vite.config.js      # Viteと単一ファイル出力（vite-plugin-singlefile）の設定
├── src/
│   ├── main.jsx        # Reactのマウント処理
│   ├── App.jsx         # メインのアプリケーションコンポーネント
│   ├── index.css       # Tailwind CSSのインポートとベーススタイル
│   ├── components/     # UIコンポーネント（Icons.jsxなど）
│   └── constants/      # 初期データや定数（index.js）
├── data/
│   └── 家計管理システム_schema.json  # サンプルモデルデータ
└── dist/
    └── index.html      # 本番用（ビルド後）の成果物。ダブルクリックで動く単一ファイル
```

## 開発の始め方

初めて開発を行う際、またはリポジトリをクローンした直後は、以下のコマンドで依存パッケージをインストールしてください。

```bash
npm install
```

## スクリプトの使い方

### 1. 開発サーバーの起動 (Development)

コードを編集してプレビューを確認したい場合は、以下のコマンドを実行します。

```bash
npm run dev
```

実行後、ターミナルに表示されるローカルURL（例: `http://localhost:5173`）にブラウザでアクセスしてください。
ソースコードを保存すると、即座にブラウザに変更が反映されます（Hot Module Replacement）。

**⚠️ 注意事項:**
ルートディレクトリ直下にある `index.html` をエクスプローラーからダブルクリックで開いても、ブラウザのセキュリティ制限（CORS）により動作しません。必ず `npm run dev` 経由で確認してください。

### 2. 本番用ファイルのビルド (Production Build)

開発が完了し、単独で動くHTMLファイルを作成したい場合は、以下のコマンドを実行します。

```bash
npm run build
```

コマンドが完了すると、`dist` フォルダの中に `index.html` が生成されます。

**💡 成果物について:**
`vite-plugin-singlefile` の機能により、CSSやJavaScriptのコードはすべてこの `dist/index.html` 1つのファイルに埋め込まれています。
ツールを使用する際や誰かに配布する際は、この `dist/index.html` を渡し、ブラウザで直接ダブルクリックして開いてください（オフラインでも動作します）。

## サンプルモデルについて

本プロジェクトの `data` ディレクトリには、動作確認やツールの機能を体験するためのサンプルモデル（スキーマ設計データ）が格納されています。

* **家計管理システム** ([家計管理システム_schema.json](file:///c:/ai-code/tool/SchemaDesigner/data/家計管理システム_schema.json))
  * **⚠️ 重要:** このサンプルモデルに定義されているテーブル構造やリレーション、各種設定といった**モデルのインスタンスは、生成AIによって自動生成されたもの**です。

### サンプルモデルの読み込み方法

1. 本ツールを起動します（開発サーバー `npm run dev` を起動するか、ビルド済みの `dist/index.html` をブラウザで開きます）。
2. 画面上のインポートボタン（ファイル選択）から `data/家計管理システム_schema.json` を選択して読み込んでください。
3. 読み込みが完了すると、家計管理システム用のテーブル構成（ユーザー、カテゴリ、収入、支出など）やリレーションが可視化され、ツールの操作感を試すことができます。

## 技術スタック

- **フレームワーク**: [React](https://react.dev/) (v18)
- **ビルドツール**: [Vite](https://vitejs.dev/)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/) (v4)
- **アイコン**: [FontAwesome](https://fontawesome.com/) (CDN経由で読み込み)
- **プラグイン**: [vite-plugin-singlefile](https://www.npmjs.com/package/vite-plugin-singlefile) (アセットのインライン化)

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

