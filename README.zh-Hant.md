# JTimes

我的攝影作品集。網站提供英文和繁體中文版本，照片按系列瀏覽。

[前往 jtimes-visual.com](https://jtimes-visual.com) · [English](README.md)

![JTimes 首頁](docs/screenshots/homepage.png)

## 在本機執行

網站使用 Astro 和 Tailwind CSS。請使用 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

開啟 [localhost:4321](http://localhost:4321/)。

## 管理照片

在本機的 `.env` 設定 `ADMIN_PASSWORD`，啟動開發伺服器後開啟[照片管理後台](http://localhost:4321/admin)。後台支援批次上傳和編輯，會將照片壓縮為 JPEG，並為每張照片建立兩份語言版本的 Markdown。

- 圖片存於 `src/assets/images/photos/`，照片資料存於 `src/content/photos/en/` 和 `src/content/photos/zh-cn/`。
- 要從作品集和首頁移除一張照片，在後台按 **Delete**。後台會移除兩種語言的資料。若其他照片資料都沒有引用該圖片，圖片檔案也會刪除。若照片還未提交到 Git，請先保留一份備份。
- 若後台詢問是否重新編號，選 **Cancel** 可保留其餘照片的標題和編號。到這一步，選中的照片已經刪除。
- 若只想從首頁移除照片，取消勾選 **Featured**。

用 `git status --short` 檢查改動。將後台的改動提交並推送後，公開網站才會更新。

## 建置與部署

```sh
npm run verify:build
npm run preview
```

正式版的建置產物在 `dist/`。推送至 `main` 後，Vercel 會自動部署。管理後台隨本機開發伺服器執行。繁中頁面沿用 `/zh-cn/` 網址，語言標記為 `zh-Hant`。

## 授權

[MIT](LICENSE)。
