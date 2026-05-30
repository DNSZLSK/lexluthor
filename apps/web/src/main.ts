import { createReaderHighlighter, interleave, renderPlayer } from '@lexluthor/reader';
import { createSubtitler, samples } from '@lexluthor/core';
import type { LangId } from '@lexluthor/core';
import { webWasmProvider } from './adapters/loader';

const highlighter = createReaderHighlighter({ onig: import('shiki/wasm') });
const subtitler = createSubtitler(webWasmProvider);

const $code = document.querySelector<HTMLTextAreaElement>('#code')!;
const $lang = document.querySelector<HTMLSelectElement>('#lang')!;
const $sample = document.querySelector<HTMLButtonElement>('#sample')!;
const $player = document.querySelector<HTMLElement>('#player')!;
const $status = document.querySelector<HTMLElement>('#status')!;

let renderSeq = 0;
async function update(): Promise<void> {
  const seq = ++renderSeq;
  const lang = $lang.value as LangId;
  const code = $code.value;

  if (!code.trim()) {
    $player.replaceChildren();
    $status.textContent = '';
    return;
  }

  $status.textContent = '…';
  try {
    const [lines, subs] = await Promise.all([highlighter.tokenizeLines(code, lang), subtitler.subtitle(code, lang)]);
    if (seq !== renderSeq) return; // un rendu plus récent a pris la main
    renderPlayer($player, interleave(lines, subs));
    $status.textContent = `${subs.length} sous-titre${subs.length > 1 ? 's' : ''}`;
  } catch (err) {
    if (seq !== renderSeq) return;
    $player.replaceChildren();
    $status.textContent = `Erreur : ${(err as Error).message}`;
    console.error('[lexluthor]', err);
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleUpdate(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(update, 150);
}

$code.addEventListener('input', scheduleUpdate);
$lang.addEventListener('change', update);

let sampleIndex = 0;
function loadSample(): void {
  const forLang = samples.filter((s) => s.lang === ($lang.value as LangId));
  const pool = forLang.length ? forLang : samples;
  const sample = pool[sampleIndex % pool.length]!;
  sampleIndex++;
  $lang.value = sample.lang;
  $code.value = sample.code;
  void update();
}
$sample.addEventListener('click', loadSample);

// Démarrage : on charge la démo Express.
loadSample();
