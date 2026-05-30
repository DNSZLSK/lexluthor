import * as vscode from 'vscode';
import type { Subtitle } from '@lexluthor/core';
import { SubtitlerService } from './subtitler-service';
import { createDecorationTypes, type DecoTypes, type RenderStyle } from './decorations';
import { buildDiagnostics } from './diagnostics';

const LAYERS_BY_DENSITY: Record<string, ReadonlySet<string>> = {
  all: new Set(['signal', 'compositional', 'idiomatic', 'lexical', 'fallback']),
  idiomatic: new Set(['signal', 'compositional', 'idiomatic']),
  headers: new Set(['signal', 'compositional']),
};
const VISIBLE_MARGIN = 60; // lignes au-delà du viewport, pour un scroll fluide
const EDIT_DEBOUNCE = 200;
const SCROLL_DEBOUNCE = 60;

/**
 * Pilote l'affichage : sur chaque évènement (éditeur actif, édition, scroll), il
 * (re)calcule les sous-titres du document (mis en cache), filtre par densité, et
 * pose les décorations UNIQUEMENT sur les lignes visibles (perf). Les alertes
 * sécu deviennent des diagnostics. Le re-parse est débouncé ; le scroll ne fait
 * que re-filtrer le cache.
 */
export class RenderController implements vscode.Disposable {
  private decoTypes: DecoTypes;
  private style: RenderStyle;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private errorShown = false;

  constructor(
    private readonly service: SubtitlerService,
    private readonly diagnostics: vscode.DiagnosticCollection,
  ) {
    this.style = this.cfg().get<RenderStyle>('renderStyle', 'inline');
    this.decoTypes = createDecorationTypes(this.style);

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((ed) => {
        if (ed) this.schedule(ed, 0);
      }),
      vscode.window.onDidChangeVisibleTextEditors(() => this.refreshAll()),
      vscode.window.onDidChangeTextEditorVisibleRanges((e) => this.schedule(e.textEditor, SCROLL_DEBOUNCE)),
      vscode.workspace.onDidChangeTextDocument((e) => {
        for (const ed of vscode.window.visibleTextEditors) {
          if (ed.document === e.document) this.schedule(ed, EDIT_DEBOUNCE);
        }
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.service.forget(doc.uri);
        this.diagnostics.delete(doc.uri);
      }),
    );
  }

  private cfg(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration('lexluthor');
  }

  private schedule(editor: vscode.TextEditor, delay: number): void {
    const key = editor.document.uri.toString();
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.render(editor);
      }, delay),
    );
  }

  refreshAll(): void {
    for (const ed of vscode.window.visibleTextEditors) this.schedule(ed, 0);
  }

  onConfigChanged(): void {
    const nextStyle = this.cfg().get<RenderStyle>('renderStyle', 'inline');
    if (nextStyle !== this.style) {
      this.decoTypes.dispose();
      this.style = nextStyle;
      this.decoTypes = createDecorationTypes(this.style);
    }
    this.refreshAll();
  }

  private clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.decoTypes.normal, []);
    editor.setDecorations(this.decoTypes.alert, []);
    this.diagnostics.delete(editor.document.uri);
  }

  private async render(editor: vscode.TextEditor): Promise<void> {
    const cfg = this.cfg();
    const doc = editor.document;
    if (!cfg.get('enabled', true)) {
      this.clear(editor);
      return;
    }
    const languages = cfg.get<string[]>('languages', []);
    if (!languages.includes(doc.languageId) || !this.service.langIdFor(doc)) {
      this.clear(editor);
      return;
    }

    let subs: Subtitle[];
    try {
      subs = await this.service.subtitlesFor(doc);
    } catch (err) {
      console.error('[lexluthor]', err);
      if (!this.errorShown) {
        this.errorShown = true;
        void vscode.window.showErrorMessage(`LexLuthor : échec du chargement — ${(err as Error).message}`);
      }
      this.clear(editor);
      return;
    }
    if (!vscode.window.visibleTextEditors.includes(editor)) return; // l'éditeur a disparu pendant l'await

    const allowed = LAYERS_BY_DENSITY[cfg.get('density', 'idiomatic')] ?? LAYERS_BY_DENSITY['idiomatic']!;
    const securityOn = cfg.get('security.enabled', true);
    const visibleRows = this.visibleRowSet(editor);

    const normalByRow = new Map<number, string[]>();
    const alertByRow = new Map<number, string[]>();
    const alertSubs: Subtitle[] = [];

    for (const s of subs) {
      const isAlert = s.severity === 'alert';
      if (isAlert && !securityOn) continue;
      if (!isAlert && !allowed.has(s.layer)) continue;

      const row = s.range.startPosition.row;
      if (isAlert) {
        alertSubs.push(s);
        if (visibleRows.has(row)) pushText(alertByRow, row, s.text);
      } else if (visibleRows.has(row)) {
        pushText(normalByRow, row, s.text);
      }
    }

    editor.setDecorations(this.decoTypes.normal, this.toOptions(doc, normalByRow, ' › '));
    editor.setDecorations(this.decoTypes.alert, this.toOptions(doc, alertByRow, '  '));
    if (securityOn) this.diagnostics.set(doc.uri, buildDiagnostics(alertSubs));
    else this.diagnostics.delete(doc.uri);
  }

  private visibleRowSet(editor: vscode.TextEditor): Set<number> {
    const rows = new Set<number>();
    const max = editor.document.lineCount - 1;
    for (const r of editor.visibleRanges) {
      const start = Math.max(0, r.start.line - VISIBLE_MARGIN);
      const end = Math.min(max, r.end.line + VISIBLE_MARGIN);
      for (let i = start; i <= end; i++) rows.add(i);
    }
    return rows;
  }

  private toOptions(doc: vscode.TextDocument, byRow: Map<number, string[]>, prefix: string): vscode.DecorationOptions[] {
    const opts: vscode.DecorationOptions[] = [];
    const maxLine = doc.lineCount - 1;
    for (const [row, texts] of byRow) {
      if (row > maxLine) continue;
      const end = doc.lineAt(row).range.end;
      opts.push({
        range: new vscode.Range(end, end),
        renderOptions: { after: { contentText: prefix + texts.join(' · ') } },
      });
    }
    return opts;
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
    this.decoTypes.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

function pushText(map: Map<number, string[]>, row: number, text: string): void {
  const arr = map.get(row);
  if (arr) arr.push(text);
  else map.set(row, [text]);
}
