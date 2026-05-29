import * as vscode from 'vscode';
import { SubtitlerService } from './subtitler-service';
import { RenderController } from './render-controller';
import { createStatusBar, updateStatusBar } from './status-bar';

const DENSITIES = ['all', 'idiomatic', 'headers'] as const;
const STYLES = ['inline', 'cinema'] as const;

export function activate(context: vscode.ExtensionContext): void {
  const diagnostics = vscode.languages.createDiagnosticCollection('lexluthor');
  const service = new SubtitlerService(context.extensionUri);
  const controller = new RenderController(service, diagnostics);
  const status = createStatusBar();

  const cfg = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration('lexluthor');
  updateStatusBar(status, cfg().get('enabled', true));

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
    vscode.commands.registerCommand('lexluthor.toggle', async () => {
      const next = !cfg().get('enabled', true);
      await cfg().update('enabled', next, vscode.ConfigurationTarget.Global);
      updateStatusBar(status, next);
    }),
    vscode.commands.registerCommand('lexluthor.cycleDensity', () => cycle('density', DENSITIES, 'idiomatic')),
    vscode.commands.registerCommand('lexluthor.cycleRenderStyle', () => cycle('renderStyle', STYLES, 'inline')),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('lexluthor')) return;
      updateStatusBar(status, cfg().get('enabled', true));
      controller.onConfigChanged();
    }),
  );

  controller.refreshAll();
}

export function deactivate(): void {
  // tout est enregistré dans context.subscriptions -> nettoyage automatique
}
