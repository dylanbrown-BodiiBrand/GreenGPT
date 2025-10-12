export function chunkMarkdown(md: string, maxTokens = 900, overlap = 80) {
  const est = (s: string) => Math.ceil(s.length / 4);
  const parts = md.split(/\n(?=# )/g); // split on H1
  const chunks: string[] = [];
  for (const block of (parts.length ? parts : [md])) {
    if (est(block) <= maxTokens) { chunks.push(block); continue; }
    const lines = block.split("\n");
    let buf: string[] = []; let toks = 0;
    for (const line of lines) {
      const t = est(line + "\n");
      if (toks + t > maxTokens && buf.length) {
        chunks.push(buf.join("\n"));
        const carry = buf.join("\n").slice(-overlap * 4);
        buf = [carry, line]; toks = est(buf.join("\n"));
      } else { buf.push(line); toks += t; }
    }
    if (buf.length) chunks.push(buf.join("\n"));
  }
  return chunks;
}
