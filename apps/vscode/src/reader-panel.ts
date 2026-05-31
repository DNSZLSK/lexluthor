import * as vscode from 'vscode';

/**
 * Panneau Webview "lecteur VOSTFR" : un onglet (façon Markdown Preview, ViewColumn.Beside)
 * qui affiche le rendu cinéma de la webapp, piloté par l'éditeur actif et synchronisé
 * (édition + scroll). Le rendu (tree-sitter + Shiki) tourne DANS le webview ; l'hôte
 * ne fait que pousser le contenu et fournir les URLs des .wasm (asWebviewUri).
 */
export class ReaderPanel {
  private static current: ReaderPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private sourceEditor: vscode.TextEditor | undefined;
  private editTimer: ReturnType<typeof setTimeout> | undefined;
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;

  static show(context: vscode.ExtensionContext): void {
    if (ReaderPanel.current) {
      ReaderPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }
    const panel = vscode.window.createWebviewPanel('lexluthor.reader', 'Lecteur VOSTFR', vscode.ViewColumn.Beside, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    });
    ReaderPanel.current = new ReaderPanel(panel, context.extensionUri, vscode.window.activeTextEditor);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    initialEditor: vscode.TextEditor | undefined,
  ) {
    this.sourceEditor = initialEditor;
    this.panel.webview.html = this.getHtml(extensionUri);

    this.panel.webview.onDidReceiveMessage((m) => this.onMessage(m), null, this.disposables);

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((ed) => {
        if (ed && ed.document.uri.scheme === 'file') {
          this.sourceEditor = ed;
          this.sendRender(ed);
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (this.sourceEditor && e.document === this.sourceEditor.document) {
          clearTimeout(this.editTimer);
          const ed = this.sourceEditor;
          this.editTimer = setTimeout(() => this.sendRender(ed), 200);
        }
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((e) => {
        if (e.textEditor === this.sourceEditor) {
          clearTimeout(this.scrollTimer);
          this.scrollTimer = setTimeout(() => this.sendScroll(e.textEditor), 50);
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        // Changer la langue des sous-titres -> re-rendre (meme decoupage, autre texte).
        if (e.affectsConfiguration('lexluthor.humanLanguage') && this.sourceEditor) {
          this.sendRender(this.sourceEditor);
        }
      }),
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private onMessage(m: { type?: string; line?: number }): void {
    if (m?.type === 'ready') {
      if (this.sourceEditor) this.sendRender(this.sourceEditor);
    } else if (m?.type === 'reveal' && typeof m.line === 'number') {
      if (this.sourceEditor) {
        const range = new vscode.Range(m.line, 0, m.line, 0);
        this.sourceEditor.revealRange(range, vscode.TextEditorRevealType.AtTop);
      }
    }
  }

  private sendRender(editor: vscode.TextEditor): void {
    const doc = editor.document;
    const name = doc.uri.path.split('/').pop() ?? 'fichier';
    this.panel.title = `VOSTFR · ${name}`;
    const locale = vscode.workspace.getConfiguration('lexluthor').get<string>('humanLanguage', 'fr');
    void this.panel.webview.postMessage({
      type: 'render',
      code: doc.getText(),
      languageId: doc.languageId,
      version: doc.version,
      locale,
    });
  }

  private sendScroll(editor: vscode.TextEditor): void {
    const top = editor.visibleRanges[0]?.start.line ?? 0;
    void this.panel.webview.postMessage({ type: 'scroll', topLine: top });
  }

  private getHtml(extensionUri: vscode.Uri): string {
    const w = this.panel.webview;
    const media = vscode.Uri.joinPath(extensionUri, 'media');
    const readerJs = w.asWebviewUri(vscode.Uri.joinPath(media, 'webview', 'reader.js'));
    const readerCss = w.asWebviewUri(vscode.Uri.joinPath(media, 'webview', 'reader.css'));
    const wasmBase = w.asWebviewUri(vscode.Uri.joinPath(media, 'wasm')).toString().replace(/\/?$/, '/');
    const onigWasm = w.asWebviewUri(vscode.Uri.joinPath(media, 'wasm', 'onig.wasm')).toString();
    const nonce = makeNonce();
    const csp = [
      "default-src 'none'",
      `script-src 'nonce-${nonce}' 'wasm-unsafe-eval'`,
      `style-src ${w.cspSource} 'unsafe-inline'`,
      `connect-src ${w.cspSource}`,
      `font-src ${w.cspSource}`,
      `img-src ${w.cspSource} data:`,
    ].join('; ');

    const inject = JSON.stringify({ wasmBase, onigWasm });

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <link rel="stylesheet" href="${readerCss}" />
  <style nonce="${nonce}">html,body{margin:0;height:100%}#player{height:100vh;overflow:auto}</style>
</head>
<body>
  <div class="player" id="player"></div>
  <script nonce="${nonce}">window.__lexluthor = ${inject};</script>
  <script type="module" nonce="${nonce}" src="${readerJs}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    ReaderPanel.current = undefined;
    clearTimeout(this.editTimer);
    clearTimeout(this.scrollTimer);
    this.panel.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

function makeNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
