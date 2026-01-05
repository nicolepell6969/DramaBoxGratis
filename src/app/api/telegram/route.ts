import { NextRequest, NextResponse } from "next/server";
import { fetchLatest, fetchStream, fetchSuggest } from "@/lib/dramabox";
import { mapToItem } from "@/lib/mapToItem";
import { normalizeStreamResponse } from "@/lib/streamParser";
import type { Item } from "@/types/item";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_API = TELEGRAM_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}`
  : "";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StreamData = ReturnType<typeof normalizeStreamResponse>;

type TelegramUser = { id: number; first_name?: string; username?: string };

type TelegramChat = { id: number };

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
};

type CallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
};

export async function POST(req: NextRequest) {
  if (!TELEGRAM_TOKEN) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is missing" },
      { status: 500 }
    );
  }

  if (TELEGRAM_SECRET) {
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    if (secretToken !== TELEGRAM_SECRET) {
      return NextResponse.json({ error: "invalid secret" }, { status: 401 });
    }
  }

  try {
    const update = await req.json();
    await handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to process Telegram update", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

async function callTelegram(method: string, payload: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Telegram API ${method} failed: ${res.status} ${detail}`);
  }

  return res.json();
}

async function sendMessage(
  chatId: number,
  text: string,
  extra?: Record<string, unknown>
) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...extra,
  });
}

async function answerCallbackQuery(queryId: string, text?: string) {
  return callTelegram("answerCallbackQuery", { callback_query_id: queryId, text });
}

async function handleUpdate(update: TelegramUpdate) {
  if (update.message) {
    await handleMessage(update.message);
  }
  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleMessage(message: TelegramMessage) {
  const chatId = message.chat.id;
  const text = message.text?.trim() ?? "";

  if (text.startsWith("/start")) {
    await sendMessage(
      chatId,
      [
        "Halo! Kirim /latest untuk daftar drama terbaru,",
        "atau gunakan /search <judul> untuk mencari.",
        "Gunakan tombol \"Lihat episode\" untuk mendapatkan link streaming cepat.",
      ].join("\n")
    );
    return;
  }

  if (text.startsWith("/latest")) {
    await sendLatest(chatId);
    return;
  }

  if (text.startsWith("/search")) {
    const keyword = text.replace(/^\/search\s*/i, "").trim();
    if (!keyword) {
      await sendMessage(chatId, "Masukkan judul setelah perintah /search.");
      return;
    }
    await sendSearch(chatId, keyword);
    return;
  }

  if (text.startsWith("/detail")) {
    const bookId = text.replace(/^\/detail\s*/i, "").trim();
    if (!bookId) {
      await sendMessage(chatId, "Masukkan bookId setelah /detail.");
      return;
    }
    await sendDetail(chatId, bookId);
    return;
  }

  await sendMessage(
    chatId,
    "Perintah tidak dikenal. Gunakan /latest atau /search <judul>."
  );
}

async function handleCallback(callback: CallbackQuery) {
  if (!callback.message?.chat.id || !callback.data) return;

  const chatId = callback.message.chat.id;

  if (callback.data.startsWith("detail:")) {
    const bookId = callback.data.replace("detail:", "");
    await sendDetail(chatId, bookId);
    await answerCallbackQuery(callback.id, "Memuat detail...");
    return;
  }

  await answerCallbackQuery(callback.id, "Tidak dikenali");
}

function formatItem(item: Item) {
  const tags = (item.tags ?? []).slice(0, 5).join(", ");
  const parts = [
    `📺 ${item.bookName}`,
    tags ? `Tag: ${tags}` : null,
    item.playCount ? `Ditonton: ${item.playCount}` : null,
    item.chapterCount ? `Episode: ${item.chapterCount}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

function buildDetailKeyboard(bookId: string) {
  return {
    inline_keyboard: [
      [
        {
          text: "Lihat episode",
          callback_data: `detail:${bookId}`,
        },
      ],
    ],
  } as const;
}

async function sendLatest(chatId: number) {
  const { data } = await fetchLatest(1);
  const records = data?.data?.newTheaterList?.records ?? [];
  const items = records.slice(0, 5).map(mapToItem);

  if (!items.length) {
    await sendMessage(chatId, "Tidak ada drama terbaru saat ini.");
    return;
  }

  for (const item of items) {
    await sendMessage(chatId, formatItem(item), {
      reply_markup: buildDetailKeyboard(item.bookId),
    });
  }
}

async function sendSearch(chatId: number, keyword: string) {
  const { data } = await fetchSuggest(keyword);
  const records = data?.data?.suggestList ?? [];
  const items = records.slice(0, 8).map(mapToItem);

  if (!items.length) {
    await sendMessage(chatId, `Tidak ada hasil untuk "${keyword}".`);
    return;
  }

  for (const item of items) {
    await sendMessage(chatId, formatItem(item), {
      reply_markup: buildDetailKeyboard(item.bookId),
    });
  }
}

function formatDetail(meta: StreamData["meta"], episodes: StreamData["episodes"]) {
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const tagText = tags.length ? `Tag: ${tags.slice(0, 5).join(", ")}` : "";
  const desc = meta.description ? meta.description.slice(0, 320) : "";

  const header = [
    `📺 ${meta.bookName ?? "Tanpa judul"}`,
    meta.playCount ? `Ditonton: ${meta.playCount}` : null,
    meta.chapterCount ? `Total episode: ${meta.chapterCount}` : null,
    tagText || null,
  ].filter(Boolean);

  const episodeLines = episodes.slice(0, 3).map((ep) => {
    const stream = ep.sources[0];
    const label = `E${ep.index + 1} - ${ep.name}`;
    if (!stream) return `${label}: sumber tidak tersedia`;
    const quality = stream.quality ? `${stream.quality}p` : "";
    return `${label}: ${quality} ${stream.url}`.trim();
  });

  return [
    header.join("\n"),
    desc ? `Ringkasan: ${desc}` : null,
    episodeLines.length ? `Episode pertama:\n${episodeLines.join("\n")}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildEpisodeButtons(episodes: StreamData["episodes"]) {
  const buttons = episodes
    .map((ep) => ({ episode: ep, source: ep.sources[0] }))
    .filter((item) => Boolean(item.source?.url))
    .slice(0, 3)
    .map((item) => [
      {
        text:
          `Putar E${item.episode.index + 1}` +
          (item.source?.quality ? ` (${item.source.quality}p)` : ""),
        url: item.source?.url ?? "",
      },
    ]);

  if (!buttons.length) return undefined;
  return { inline_keyboard: buttons } as const;
}

async function sendDetail(chatId: number, bookId: string) {
  const { status, data } = await fetchStream(bookId, 1);
  if (status >= 400) {
    await sendMessage(chatId, `Gagal memuat drama ${bookId} (status ${status}).`);
    return;
  }

  const { meta, episodes } = normalizeStreamResponse(data);
  await sendMessage(chatId, formatDetail(meta, episodes), {
    reply_markup: buildEpisodeButtons(episodes),
  });
}
