# CS Case Tracker — 客訴案件管理系統

以 Next.js 15、TypeScript、Tailwind CSS、Supabase 建置的客訴案件追蹤系統，並預留 LINE Messaging API 通知整合。

## 功能

| 頁面 | 說明 |
|------|------|
| Dashboard | 全部 / 處理中 / 待確認 / 已結案 / 逾期案件統計 |
| 建立案件 | 客戶資訊、客訴類型、指派、附件上傳 |
| 案件列表 | 依狀態、處理人、客訴類型篩選 |
| 案件詳情 | 基本資訊、處理紀錄、回覆、結案 |

## 角色

- **客服 (cs)**：建立案件、確認結案
- **處理人 (handler)**：處理案件、回覆改善結果
- **管理者 (admin)**：指派、監督、結案

## 案件流程

```
新案件 → 已指派 → 處理中 → 已回覆改善結果 → 客服確認中 → 已結案
```

## 技術棧

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL + Storage)
- LINE Messaging API（預留）

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

### 3. Supabase 設定

1. 在 [Supabase](https://supabase.com) 建立專案
2. 於 SQL Editor 依序執行 `supabase/migrations/` 內所有 migration（含 `010_case_attachments.sql`：建立 `case_attachments` 表與 **private** bucket `case-attachments`）
3. 附件下載透過 signed URL；bucket 請保持非公開（migration 已設定 `public = false`）
4. 將 URL 與 anon key 填入 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## LINE 通知 API（預留）

| 端點 | 說明 |
|------|------|
| `POST /api/line/notify` | 手動觸發通知 |
| `POST /api/line/webhook` | LINE Webhook |
| `POST /api/cron/overdue` | 逾期掃描與通知 |

通知類型：

- `case_created` — 建立案件通知負責人
- `case_completed` — 處理完成通知客服
- `case_overdue` — 逾期提醒

設定 `LINE_CHANNEL_ACCESS_TOKEN` 與 `LINE_CHANNEL_SECRET` 後即可啟用。

### 逾期 Cron 範例

```bash
curl -X POST http://localhost:3000/api/cron/overdue \
  -H "Authorization: Bearer your-cron-secret"
```

## 專案結構

```
src/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── cases/
│   │   ├── page.tsx          # 案件列表
│   │   ├── new/page.tsx      # 建立案件
│   │   └── [id]/page.tsx     # 案件詳情
│   ├── actions/cases.ts      # Server Actions
│   └── api/
│       ├── line/             # LINE API
│       └── cron/overdue/     # 逾期排程
├── components/
├── lib/
│   ├── data/                 # Supabase 資料存取
│   ├── line/                 # LINE 通知
│   └── supabase/
└── types/
supabase/migrations/          # 資料庫 Schema
```

## 資料表

- `users` — 使用者（角色：cs / handler / admin）
- `cases` — 案件
- `case_logs` — 處理紀錄

## 後續建議

- [ ] Supabase Auth 登入與角色權限
- [ ] RLS 細部政策（依角色限制讀寫）
- [ ] LINE Login 綁定 `line_user_id`
- [ ] Email 通知備援
- [ ] 匯出報表（CSV / Excel）

## License

MIT
