import { NextRequest, NextResponse } from "next/server";
import { fetchStream } from "@/lib/dramabox";
import { applyCors, handlePreflight } from "@/lib/cors";
import { normalizeStreamResponse } from "@/lib/streamParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function OPTIONS(req: NextRequest) {
  return handlePreflight(req);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await ctx.params;
  const { headers } = applyCors(req);
  const url = new URL(req.url);
  const index = Number(url.searchParams.get("index") ?? 1);

  const { status, data } = await fetchStream(bookId, index);
  const { meta, episodes } = normalizeStreamResponse(data);

  return NextResponse.json({ meta, episodes }, { status, headers });
}
