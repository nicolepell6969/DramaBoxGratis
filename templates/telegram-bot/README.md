# Dramabox Telegram Bot (standalone repo template)

Template ini menyiapkan bot Telegram sederhana yang memanfaatkan API Dramabox dari proyek utama. Salin folder ini ke repository baru, lalu isi variabel lingkungan sebelum menjalankan bot.

## Fitur
- Perintah `/latest` untuk daftar rilis drama terbaru.
- Perintah `/search <judul>` untuk mencari drama.
- Perintah `/detail <bookId> [index]` untuk melihat daftar episode dan memilih episode dengan inline button.
- Mendukung polling maupun webhook.

## Menyalin ke repository baru
1. Buat folder kosong di luar monorepo ini, lalu salin isi template:
   ```bash
   mkdir ../dramabox-telegram-bot
   cp -r templates/telegram-bot/. ../dramabox-telegram-bot/
   cd ../dramabox-telegram-bot
   git init
   ```
2. Instal dependensi dan buat file `.env` dari contoh:
   ```bash
   npm install
   cp .env.example .env
   ```
3. Isi variabel lingkungan pada `.env`:
   - `BOT_TOKEN`: token bot Telegram Anda dari @BotFather.
   - `DRAMABOX_BASE_URL`: host API Dramabox (misal `https://dramaboxgratis.ninja`).
   - `WEBHOOK_URL`: URL publik yang menerima webhook (biarkan kosong untuk polling).

4. Jalankan secara lokal dengan polling:
   ```bash
   npm start
   ```

5. (Opsional) Aktifkan webhook ketika sudah memiliki URL publik:
   ```bash
   WEBHOOK_URL=https://contoh.ngrok.dev npm run webhook
   ```

## Struktur file
- `src/index.js`: entri utama bot dengan handler perintah.
- `.env.example`: contoh konfigurasi lingkungan.
- `package.json`: dependensi dan skrip bot.

## Lisensi
Gunakan sesuai kebutuhan; tambahkan lisensi di repository baru Anda bila diperlukan.
