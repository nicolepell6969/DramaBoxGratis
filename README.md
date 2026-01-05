This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Telegram bot

Bot webhook tersedia di `/api/telegram` dan memanfaatkan data dramabox yang sama dengan aplikasi web. Siapkan variabel lingkungan berikut sebelum mengaktifkan webhook:

- `TELEGRAM_BOT_TOKEN` – token bot dari [@BotFather](https://t.me/BotFather).
- `TELEGRAM_WEBHOOK_SECRET` – token rahasia opsional untuk memvalidasi header `x-telegram-bot-api-secret-token`.

Contoh menghubungkan webhook (ganti `BASE_URL` dengan domain yang bisa diakses Telegram):

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d url="$BASE_URL/api/telegram" \
  -d secret_token="$TELEGRAM_WEBHOOK_SECRET"
```

Perintah yang tersedia di bot:

- `/latest` menampilkan daftar drama terbaru dengan tombol untuk membuka detail episode.
- `/search <judul>` mencari drama berdasarkan kata kunci.
- `/detail <bookId>` langsung membuka detail dan tautan stream untuk ID tertentu.

### Menjalankan bot tanpa VPS
Selain VPS, Anda bisa menjalankan bot di beberapa opsi berikut:

- **Polling lokal** di laptop/PC Anda (bot tidak perlu URL publik selama memakai polling).
- **Platform serverless dengan HTTP** seperti Vercel, Netlify Functions, atau Cloudflare Workers/Tunnels—pastikan men-deploy handler webhook dan mengatur URL publik.
- **PaaS gratis/hemat** seperti Render, Railway, Fly.io, atau Heroku (dyno gratis) untuk proses Node.js yang terus berjalan.
- **Tunneling** (ngrok, Cloudflare Tunnel) untuk memberi URL publik sementara ke server lokal yang menjalankan webhook.

Kontainer sandbox ini tidak memiliki konektivitas keluar ke Telegram, sehingga bot tidak bisa dijalankan langsung di sini. Jalankan di mesin/layanan dengan akses internet agar perintah bot berfungsi.

## Membuat repository bot Telegram terpisah
Jika Anda ingin memisahkan bot Telegram ke repo lain, gunakan template yang ada di `templates/telegram-bot`:

```bash
mkdir ../dramabox-telegram-bot
cp -r templates/telegram-bot/. ../dramabox-telegram-bot/
cd ../dramabox-telegram-bot
npm install
cp .env.example .env
```

Isi `.env` sesuai lingkungan Anda, lalu jalankan `npm start` untuk mode polling atau `npm run webhook` jika sudah memiliki URL webhook publik. Template menggunakan endpoint `/api/dramabox/*` dari aplikasi ini sebagai backend.
