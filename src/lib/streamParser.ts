export type Source = {
  url: string;
  quality: number;
  cdn: string;
  isDefault: boolean;
  isVip: boolean;
};

export type Episode = {
  id: string;
  index: number;
  name: string;
  thumbnail: string | null;
  isCharge: boolean;
  sources: Source[];
};

export type StreamMeta = {
  bookId?: string;
  bookName?: string;
  bookCover?: string;
  playCount?: unknown;
  corner: unknown;
  chapterCount: number;
  description: string;
  tags: string[];
  orientation: "portrait";
};

function sortSources(sources: Source[]) {
  sources.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.quality - a.quality;
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeStreamResponse(raw: any): {
  meta: StreamMeta;
  episodes: Episode[];
} {
  const d = raw?.data ?? {};

  const meta: StreamMeta = {
    bookId: d.bookId,
    bookName: d.bookName,
    bookCover: d.bookCover,
    playCount: d.playCount,
    corner: d.corner ?? null,
    chapterCount: d.chapterCount ?? d.chapterList?.length ?? 0,
    description: d.introduction ?? "",
    tags: d.tags ?? [],
    orientation: "portrait",
  };

  const episodes: Episode[] = (d.chapterList ?? []).map((ch: any) => {
    const sources: Source[] = (ch.cdnList ?? [])
      .flatMap((cdn: any) =>
        (cdn.videoPathList ?? []).map((v: any) => ({
          url: v.videoPath,
          quality: Number(v.quality ?? 0),
          cdn: String(cdn.cdnDomain ?? ""),
          isDefault: cdn.isDefault === 1 && v.isDefault === 1,
          isVip: v.isVipEquity === 1,
        }))
      )
      .filter((s): s is Source => Boolean(s.url && s.quality));

    sortSources(sources);

    return {
      id: String(ch.chapterId),
      index: Number(ch.chapterIndex ?? 0),
      name: ch.chapterName ?? `EP ${Number(ch.chapterIndex ?? 0) + 1}`,
      thumbnail: ch.chapterImg ?? null,
      isCharge: !!(ch.isCharge ?? ch.chargeChapter),
      sources,
    };
  });

  return { meta, episodes };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
