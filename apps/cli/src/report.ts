import { topN, type Ranked, type RepoReport } from '@lexluthor/core';

export interface PrintMeta {
  readonly dir: string;
  readonly scanned: number;
  readonly skipped: number;
  readonly top: number;
}

function pct(n: number, total: number): string {
  return total === 0 ? '0.0' : ((n / total) * 100).toFixed(1);
}
function pad(n: number | string, w: number): string {
  return String(n).padStart(w);
}

function section(out: string[], title: string, rows: readonly Ranked[]): void {
  if (!rows.length) return;
  out.push('', title);
  for (const r of rows) out.push(`  ${pad(r.count, 6)}  ${r.key}`);
}

function sortedHotspots(repo: RepoReport, top: number) {
  return Object.entries(repo.recopied)
    .sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1))
    .slice(0, top);
}

/** Rapport terminal lisible : entête couverture + 4 listes classées par impact. */
export function printReport(repo: RepoReport, meta: PrintMeta): void {
  const total = repo.statements;
  const out: string[] = [];
  out.push('', `lexluthor scan — ${meta.dir}`);
  out.push(`Fichiers : ${repo.files} (sautés ${meta.skipped})   Instructions : ${total}   Erreurs de parsing : ${repo.parseErrors}`);
  out.push('');
  out.push(`Couverture : ${pct(repo.counts.rich + repo.counts.shape, total)}%   (backlog ${pct(repo.counts.recopied + repo.counts.silent, total)}%)`);
  out.push(`  ${pad(repo.counts.rich, 7)}  ${pad(pct(repo.counts.rich, total) + '%', 6)}  lecture riche`);
  out.push(`  ${pad(repo.counts.shape, 7)}  ${pad(pct(repo.counts.shape, total) + '%', 6)}  phrase de forme`);
  out.push(`  ${pad(repo.counts.recopied, 7)}  ${pad(pct(repo.counts.recopied, total) + '%', 6)}  code recopié   (backlog)`);
  out.push(`  ${pad(repo.counts.silent, 7)}  ${pad(pct(repo.counts.silent, total) + '%', 6)}  silence        (backlog)`);
  const langs = Object.entries(repo.byLang)
    .map(([l, b]) => `${l} ${pct(b.counts.rich + b.counts.shape, b.statements)}%`)
    .join('  ·  ');
  if (langs) out.push(`  par langage : ${langs}`);

  section(out, 'Top mots inconnus  (-> glossaire)', topN(repo.unknownWords, meta.top));
  section(out, 'Top verbes manquants  (-> VERB_PREFIXES)', topN(repo.missingVerbs, meta.top));
  section(out, 'Top types non couverts  (-> nouvelles règles)', topN(repo.uncoveredTypes, meta.top));

  const hot = sortedHotspots(repo, meta.top);
  if (hot.length) {
    out.push('', 'Top hotspots recopiés  (-> phrase de forme / chaînage)');
    for (const [sig, b] of hot) {
      out.push(`  ${pad(b.count, 6)}  ${sig}`);
      if (b.examples[0]) out.push(`          ex: ${b.examples[0]}`);
    }
  }
  out.push('');
  process.stdout.write(out.join('\n') + '\n');
}

/** Sortie JSON à forme stable (pour outillage / suivi dans le temps). */
export function printJson(repo: RepoReport, top: number): void {
  const data = {
    files: repo.files,
    statements: repo.statements,
    parseErrors: repo.parseErrors,
    coveragePct: Number(pct(repo.counts.rich + repo.counts.shape, repo.statements)),
    counts: repo.counts,
    byLang: repo.byLang,
    glossaryCandidates: topN(repo.unknownWords, top),
    verbCandidates: topN(repo.missingVerbs, top),
    ruleCandidates: topN(repo.uncoveredTypes, top),
    recopiedHotspots: sortedHotspots(repo, top).map(([signature, b]) => ({
      signature,
      count: b.count,
      examples: b.examples,
    })),
  };
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
