import * as vscode from 'vscode';

export type RenderStyle = 'inline' | 'cinema';

export interface DecoTypes {
  readonly normal: vscode.TextEditorDecorationType;
  readonly alert: vscode.TextEditorDecorationType;
  dispose(): void;
}

/**
 * Crée les types de décoration selon le style.
 *  - 'inline' (fiable) : annotation grisée/italique en FIN de ligne (façon GitLens).
 *  - 'cinema' (EXPÉRIMENTAL) : tente de pousser le texte SOUS la ligne via une
 *    injection CSS dans `textDecoration` (non entièrement sanitize par VS Code).
 *    Peut s'afficher imparfaitement selon la version — d'où le réglage pour revenir
 *    à 'inline'. Le contenu (contentText) est fourni par range dans le contrôleur.
 */
export function createDecorationTypes(style: RenderStyle): DecoTypes {
  const cinemaCss = 'none; display: block; margin: 1px 0 0 0; opacity: 0.9;';

  const normal = vscode.window.createTextEditorDecorationType({
    after:
      style === 'cinema'
        ? { color: new vscode.ThemeColor('descriptionForeground'), fontStyle: 'italic', textDecoration: cinemaCss }
        : { color: new vscode.ThemeColor('descriptionForeground'), fontStyle: 'italic', margin: '0 0 0 2em' },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });

  const alert = vscode.window.createTextEditorDecorationType({
    after:
      style === 'cinema'
        ? { color: new vscode.ThemeColor('errorForeground'), fontWeight: 'bold', textDecoration: cinemaCss }
        : { color: new vscode.ThemeColor('errorForeground'), fontWeight: 'bold', margin: '0 0 0 2em' },
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
