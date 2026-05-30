import * as vscode from 'vscode';

export function createStatusBar(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  item.command = 'lexluthor.toggle';
  return item;
}

export function updateStatusBar(item: vscode.StatusBarItem, enabled: boolean): void {
  item.text = enabled ? '$(closed-captioning) VOSTFR' : '$(closed-captioning) VOSTFR off';
  item.tooltip = enabled
    ? 'LexLuthor actif. Cliquer pour masquer les sous-titres'
    : 'LexLuthor inactif. Cliquer pour afficher les sous-titres';
  item.show();
}
