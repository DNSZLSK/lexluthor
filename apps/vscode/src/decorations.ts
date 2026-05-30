import * as vscode from 'vscode';

export interface DecoTypes {
  readonly normal: vscode.TextEditorDecorationType;
  readonly alert: vscode.TextEditorDecorationType;
  dispose(): void;
}

/**
 * Décorations de fin de ligne (façon GitLens) : annotation grisée/italique pour les
 * sous-titres, rouge/gras pour les alertes. Le contenu (contentText) est fourni par
 * range dans le contrôleur.
 *
 * NB : le format « cinéma » (sous-titre SOUS la ligne) a été retiré — verdict du
 * spike B0 : Monaco ne réalloue pas la hauteur de ligne pour un pseudo-élément CSS,
 * donc le texte chevauche la ligne suivante. Inline est le rendu définitif de
 * l'extension ; la webapp garde le look cinéma.
 */
export function createDecorationTypes(): DecoTypes {
  const normal = vscode.window.createTextEditorDecorationType({
    after: { color: new vscode.ThemeColor('descriptionForeground'), fontStyle: 'italic', margin: '0 0 0 2em' },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });

  const alert = vscode.window.createTextEditorDecorationType({
    after: { color: new vscode.ThemeColor('errorForeground'), fontWeight: 'bold', margin: '0 0 0 2em' },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });

  return {
    normal,
    alert,
    dispose() {
      normal.dispose();
      alert.dispose();
    },
  };
}
