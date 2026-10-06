---
name: miracle
description: "既存Oracleのブラウザ基盤でChatGPT WorkのGPT-5.6 Sol・ウルトラに作業を依頼し、結果を回収・検証する。miracleで依頼、Workで相談、Sol ultraに任せるときに使う。"
---

# Miracle

Oracleのファイル束ね、ログイン済み専用Chromeプロファイル、回答回収、成果物保存、専用タブの後片付けを再利用して、**Work / GPT-5.6 Sol / Ultra（ウルトラ）**へ依頼する。

## 前提

Node.js 24以上、Google Chrome、Oracle 0.20.0、WorkでGPT-5.6 Sol・Ultraを利用できるChatGPTアカウントが必要。Oracleはこのパッケージの依存関係として導入される。既存Oracleのログイン済みプロファイルを `MIRACLE_BROWSER_PROFILE`、または `~/.oracle/config.json` の `browser.manualLoginProfileDir` で指定する。

## 実行

必ずこのスキルの[ランチャー](scripts/miracle.mjs)を使う。導入済みの共通コマンド `miracle` も同じランチャーを参照する。コマンドが見つからない場合はランチャーの絶対パスをNodeで実行する。

```bash
miracle --dry-run summary --files-report -p "<依頼>" --file "src/**"
miracle --timeout 20m -p "<依頼>" --file "src/**" --write-output "/absolute/path/result.md"
miracle status --hours 72
miracle session <id> --render
```

1. 目的、現状、依頼範囲、制約、完了条件、期待する出力を自立したプロンプトにまとめる。Work側はローカル作業場を直接参照できないので、必要な最小限のファイルを渡す。
2. `--dry-run summary --files-report`で入力を確認する。添付資料の指示とユーザーからの依頼を区別する。`.local/`、`.env`、秘密鍵、認証情報は渡さない。
3. ランチャーで実行する。Workはツールで作業できるため、レビューだけなら「分析のみ。外部送信・公開・変更操作は行わない」と明記する。実作業はユーザーが許可した範囲と完了条件を明記する。
4. 次のUI検証ログを確認する。モード・モデル・思考量のどれかを証明できない場合は、送信前に失敗させる。API、Chat、別モデル、低い思考量へ切り替えない。
   - `requestedMode=work; resolvedMode=Work; verified=yes; failClosed=yes`
   - `requestedKey=gpt-5.6-sol`、`resolvedLabel=GPT-5.6 Sol`、`verified=yes`
   - `requestedLevel=ultra`、`resolvedLabel=Ultra`または`ウルトラ`、`verified=yes; failClosed=yes`
   - `Miracle model selection submission gate: Work + GPT-5.6 Sol + Ultra verified`
5. 回答を保存し、コード・資料・必要なテストで検証する。Workの回答だけでローカル変更や完了を断定しない。終了後は専用タブが閉じられたことを確認する。

## 再利用と復旧

- 実装の詳細は[ランタイム説明](references/runtime.md)。Oracle本体・既存スキル・設定は編集せず、miracle実行プロセス内だけ互換処理を適用する。
- 設定・セッション・回答は `~/.miracle/`。認証は既存Oracleの専用プロファイルを共有し、既存のタブlease・profile lockで並行実行を管理する。
- 待機中は同じプロセスをpollし、別の依頼を重複送信しない。`status`と`session`は保存済み結果の閲覧用。新たな会話へ送るfollowupやユーザーのタブの再利用はサポートしない。
- テキストは既存Oracleによりinline化され、必要なら既存upload経路を使う。`--browser-attachments never`でinlineのみ、`always`でuploadを指定できる。
- 認証が失効した場合は利用環境の認証ガイドに従い、専用プロファイルへログインし直す。資格情報を取得・表示せず、別のAPI認証に逃げない。
- Oracle更新で互換チェックが失敗した場合は未送信で停止する。対象箇所を再確認して[検証](scripts/test.mjs)を通し、実ブラウザで再検証する。
