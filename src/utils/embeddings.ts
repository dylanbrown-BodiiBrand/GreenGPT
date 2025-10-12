// src/utils/embeddings.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
const MAX_TOKENS = Number(process.env.EMBED_MAX_TOKENS || 7000);
const MAX_CHARS = Number(process.env.EMBED_MAX_CHARS || 28000);
const BATCH_SIZE = Number(process.env.EMBED_BATCH_SIZE || 64);

// VERY rough token estimate; good enough for a safety cut.
const approxTokens = (s: string) => Math.ceil(s.length / 4);

function clampForEmbed(s: string) {
  if (s.length <= MAX_CHARS) return s;
  return s.slice(0, MAX_CHARS) + " …[truncated-for-embed]";
}

export async function embedBatch(chunks: string[], dlog?: (stage: string, msg: string, extra?: any) => void) {
  // 1) Trim each chunk to stay well under 8k tokens
  const safeInputs = chunks.map((c, i) => {
    const t = approxTokens(c);
    if (dlog) dlog("embed.input", "pre-trim", { idx: i, tokens: t, chars: c.length });
    const trimmed = t > MAX_TOKENS ? clampForEmbed(c) : c;
    if (dlog) {
      const t2 = approxTokens(trimmed);
      dlog("embed.input", "post-trim", { idx: i, tokens: t2, chars: trimmed.length, trimmed: t2 < t });
    }
    return trimmed;
  });

  // 2) Call embeddings API in batches
  const out: number[][] = [];
  for (let i = 0; i < safeInputs.length; i += BATCH_SIZE) {
    const slice = safeInputs.slice(i, i + BATCH_SIZE);
    if (dlog) dlog("embed.batch", "sending", { start: i, count: slice.length, model: MODEL });

    const res = await client.embeddings.create({
      model: MODEL,
      input: slice,
    });

    // OpenAI returns embeddings aligned with inputs
    for (const item of res.data) out.push(item.embedding as unknown as number[]);
  }

  if (dlog) dlog("embed.done", "total embeddings", { count: out.length });
  return out;
}
