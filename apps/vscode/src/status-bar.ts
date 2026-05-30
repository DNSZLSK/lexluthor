import * as vscode from 'vscode';

/** Pastille de barre d'état : clic = ouvre le lecteur VOSTFR du fichier actif. */
export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'lexluthor.openReader';
  item.text = '$(book) VOSTFR';
  item.tooltip = 'Ouvrir le lecteur VOSTFR (sous-titres du fichier actif)';
  item.show();
  return item;
}
