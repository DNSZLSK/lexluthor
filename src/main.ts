import './styles/theme.css';
import './styles/player.css';

import { createEngine } from './engine/engine';
import { createJavaScriptAdapter } from './adapters/javascript';
import { createTypeScriptAdapter } from './adapters/typescript';
import { loadLanguage } from './adapters/loader';
import { tokenizeLines } from './ui/highlighter';
import { interleave } from './ui/interleave';
import { renderPlayer } from './ui/render';
import { samples } from './data/samples';
import type { LangId, LanguageAdapter } from './engine/types';

// Fabriques d'adapter par langage (v1 : JavaScript). Le moteur lit `adapters`
// au moment de l'appel, donc on peut le peupler paresseusement.
const ADAPTER_FACTORIES: Partial<Record<LangId, (lang: Awaited<ReturnType<typeof loadLanguage>>) => LanguageAdapter>> = {
  javascript: createJavaScriptAdapter,
  typescript: createTypeScriptAdapter,
};

const adapters: Partial<Record<LangId, LanguageAdapter>> = {};
const engine = createEngine(adapters);

const $code = document.querySelector<HTMLTextAreaElement>('#code')!;
const $lang = document.querySelector<HTMLSelectElement>('#lang')!;
const $sample = document.querySelector<HTMLButtonElement>('#sample')!;
const $player = document.querySelector<HTMLElement>('#player')!;
const $status = document.querySelector<HTMLElement>('#status')!;

const adapterCache = new Map<LangId, Promise<LanguageAdapter>>();
function ensureAdapter(lang: LangId): Promise<LanguageAdapter> {
  let p = adapterCache.get(lang);
  if (!p) {
    const factory = ADAPTER_FACTORIES[lang];
    if (!factory) return Promise.reject(new Error(`Langage non supporté : ${lang}`));
    p = loadLanguage(lang).then((language) => {
      const adapter = factory(language);
      adapters[lang] = adapter;
      return adapter;
    });
    adapterCache.set(lang, p);
  }
  return p;
}

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
    await ensureAdapter(lang);
    const [lines, subs] = await Promise.all([tokenizeLines(code, lang), Promise.resolve(engine.subtitle(code, lang))]);
    if (seq !== renderSeq) return; // un rendu plus recent a pris la main
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

// Demarrage : on charge la demo Express.
loadSample();
