# Antigravity Agent Rules for this Project

## Auto Git Synchronization (自動Git同期ルール)
このプロジェクトで作業する際は、チームメンバーへの最新反映およびGitHub Pages等の更新を確実に行うため、**Git同期を必ずAIエージェントが自動で実行**してください。ユーザーに手動でのコマンド実行を求めてはいけません。

1. **作業開始前 (Before starting ANY code changes):**
   - 他の変更を取り込むため、自動で `git pull` を実行する。

2. **作業完了時 (After completing ANY code/file changes):**
   手作業を待たずに、以下の3ステップをAIエージェント自身がコマンド実行して完了すること：
   - **ステップ1**: 変更したすべてのファイルをステージングする
     `git add .`
   - **ステップ2**: 変更内容に応じた分かりやすいメッセージをつけてコミットする（例: `git commit -m "UIの変更: ○○を修正"`）
     `git commit -m "<変更内容に応じた説明>"`
   - **ステップ3**: GitHub（リモートサーバー）に変更を送信する
     `git push`

