const CJK = /[⺀-鿿぀-ヿ가-힯]/;

const cache = new Map<string, string[]>();

async function wikidata(params: Record<string, string>): Promise<any> {
  const u = new URL("https://www.wikidata.org/w/api.php");
  for (const [k, v] of Object.entries({ format: "json", origin: "*", ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error(`wikidata ${r.status}`);
  return r.json();
}

const clean = (t: string) => t.replace(/\s*\([^)]*\)\s*$/, "").trim();

// 把含 CJK 的片名扩展为「原文 + Wikidata 英文/日文标题」多个变体；
// 英文索引站对原文零命中，变体并行发起多个搜索任务后由调用方合并结果。
export async function expandQuery(q: string): Promise<string[]> {
  const hit = cache.get(q);
  if (hit) return hit;
  const out = [q];
  if (CJK.test(q)) {
    try {
      const s = await wikidata({ action: "wbsearchentities", search: q, language: "zh", uselang: "zh", type: "item", limit: "5" });
      const ids: string[] = (s.search ?? []).slice(0, 3).map((x: { id: string }) => x.id);
      if (ids.length) {
        const e = await wikidata({ action: "wbgetentities", ids: ids.join("|"), props: "labels", languages: "en|ja" });
        for (const id of ids) {
          const labels = e.entities?.[id]?.labels ?? {};
          for (const lang of ["en", "ja"]) {
            const t = typeof labels[lang]?.value === "string" ? clean(labels[lang].value) : "";
            if (t && t.length >= 2 && !/^list of /i.test(t) && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t);
          }
        }
      }
    } catch {
      // Wikidata 不可达时退回原文搜索
    }
  }
  const variants = out.slice(0, 4);
  cache.set(q, variants);
  return variants;
}
