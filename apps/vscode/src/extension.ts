import * as vscode from 'vscode';
import { SubtitlerService } from './subtitler-service';
import { RenderController } from './render-controller';
import { ReaderPanel } from './reader-panel';
import { createStatusBar } from './status-bar';

const DENSITIES = ['all', 'idiomatic', 'headers'] as const;
const LANGUAGES = ['fr', 'en', 'es'] as const;

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('lexluthor');
  const service = new SubtitlerService(context.extensionUri);
  const controller = new RenderController(service, diagnostics);
  const status = createStatusBar();

  const cfg = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration('lexluthor');

  async function cycle<T extends string>(key: string, values: readonly T[], fallback: T): Promise<void> {
    const cur = cfg().get<T>(key, fallback);
    const next = values[(values.indexOf(cur) + 1) % values.length]!;
    await cfg().update(key, next, vscode.ConfigurationTarget.Global);
    void vscode.window.setStatusBarMessage(`LexLuthor : ${key} = ${next}`, 2500);
  }

  context.subscriptions.push(
    diagnostics,
    controller,
    status,
    vscode.commands.registerCommand('lexluthor.openReader', () => ReaderPanel.show(context)),
    vscode.commands.registerCommand('lexluthor.toggleInline', async () => {
      const next = !cfg().get('inline.enabled', false);
      await cfg().update('inline.enabled', next, vscode.ConfigurationTarget.Global);
      void vscode.window.setStatusBarMessage(`LexLuthor : sous-titres en ligne ${next ? 'activés' : 'désactivés'}`, 2500);
    }),
    vscode.commands.registerCommand('lexluthor.cycleDensity', () => cycle('density', DENSITIES, 'idiomatic')),
    vscode.commands.registerCommand('lexluthor.cycleLanguage', () => cycle('humanLanguage', LANGUAGES, 'fr')),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('lexluthor')) controller.onConfigChanged();
    }),
  );

  controller.refreshAll();
}

export function deactivate(): void {
  // tout est enregistré dans context.subscriptions -> nettoyage automatique
}
