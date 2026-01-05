import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const {
  BOT_TOKEN,
  DRAMABOX_BASE_URL = "http://localhost:3000",
  WEBHOOK_URL,
} = process.env;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN wajib diisi di file .env");
}

const baseUrl = DRAMABOX_BASE_URL.replace(/\/$/, "");

async function getJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`(${res.status}) ${body || res.statusText}`);
  }
  return res.json();
}

async function fetchLatest() {
  const data = await getJson(`/api/dramabox/latest?pageNo=1`);
  return data.records ?? [];
}

async function fetchSearch(keyword) {
  const data = await getJson(`/api/dramabox/search`, {
    method: "POST",
    body: JSON.stringify({ keyword }),
  });
  return data.records ?? [];
}

async function fetchDetail(bookId, index = 1) {
  const data = await getJson(`/api/dramabox/chapters/${bookId}?index=${index}`);
  return data;
}

function formatDramaList(items) {
  if (!items.length) return "(tidak ada hasil)";
  return items
    .map((item, i) => {
      const title = item.name ?? item.bookName ?? "Tanpa judul";
      const bookId = item.bookId ?? item.book_id ?? item.id ?? "?";
      const updated = item.updateTime ?? item.update_time ?? "";
      return `${i + 1}. ${title}\n   ID: ${bookId}${updated ? `\n   Update: ${updated}` : ""}`;
    })
    .join("\n\n");
}

function buildEpisodeButtons(episodes = []) {
  return episodes.map((ep) => [
    {
      text: `Ep ${ep.episode ?? ep.index ?? "?"}`,
      callback_data: `ep:${ep.bookId ?? ep.book_id ?? ""}:${ep.episode ?? ep.index ?? 1}`,
    },
  ]);
}

async function handleEpisodeSelection(bot, query) {
  const [, bookId, episodeIndex] = query.data.split(":");
  try {
    const { meta, episodes } = await fetchDetail(bookId, Number(episodeIndex));
    const title = meta?.name ?? meta?.bookName ?? "Drama";
    const episode = episodes.find(
      (e) => Number(e.episode ?? e.index) === Number(episodeIndex)
    );
    const urls = [episode?.sources?.[0]?.url, episode?.m3u8].filter(Boolean);

    if (!urls.length) {
      await bot.answerCallbackQuery(query.id, { text: "Link tidak ditemukan" });
      return;
    }

    const caption = `${title} - Episode ${episodeIndex}\n${urls.join("\n")}`;
    await bot.sendMessage(query.message.chat.id, caption);
    await bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error("Gagal memuat episode", err);
    await bot.answerCallbackQuery(query.id, { text: "Gagal memuat episode" });
  }
}

function startBot() {
  const isWebhook = Boolean(WEBHOOK_URL) || process.argv.includes("--webhook");
  const bot = new TelegramBot(BOT_TOKEN, { polling: !isWebhook });

  if (isWebhook) {
    const webhookUrl = `${WEBHOOK_URL.replace(/\/$/, "")}/telegram`; // pengguna bebas mengatur path
    bot.setWebHook(webhookUrl);
    console.log(`Webhook diatur ke ${webhookUrl}`);
  } else {
    console.log("Bot berjalan dengan polling");
  }

  bot.onText(/^\/latest/, async (msg) => {
    try {
      const items = await fetchLatest();
      await bot.sendMessage(msg.chat.id, formatDramaList(items));
    } catch (err) {
      await bot.sendMessage(msg.chat.id, `Gagal memuat data: ${err.message}`);
    }
  });

  bot.onText(/^\/search (.+)/, async (msg, match) => {
    const keyword = match?.[1];
    if (!keyword) return bot.sendMessage(msg.chat.id, "Kata kunci wajib diisi");
    try {
      const items = await fetchSearch(keyword.trim());
      await bot.sendMessage(msg.chat.id, formatDramaList(items));
    } catch (err) {
      await bot.sendMessage(msg.chat.id, `Gagal mencari: ${err.message}`);
    }
  });

  bot.onText(/^\/detail (\S+)(?:\s+(\d+))?/, async (msg, match) => {
    const bookId = match?.[1];
    const index = Number(match?.[2] ?? 1);
    if (!bookId) return bot.sendMessage(msg.chat.id, "bookId wajib diisi");
    try {
      const { meta, episodes } = await fetchDetail(bookId, index);
      const header = `${meta?.name ?? meta?.bookName ?? "Drama"}\nJumlah episode: ${
        episodes.length
      }`;
      await bot.sendMessage(msg.chat.id, header, {
        reply_markup: { inline_keyboard: buildEpisodeButtons(episodes) },
      });
    } catch (err) {
      await bot.sendMessage(msg.chat.id, `Gagal memuat detail: ${err.message}`);
    }
  });

  bot.on("callback_query", async (query) => {
    if (!query.data?.startsWith("ep:")) return;
    await handleEpisodeSelection(bot, query);
  });
}

startBot();
