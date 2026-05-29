import * as vscode from 'vscode';
import type { Subtitle } from '@lexluthor/core';

/** Transforme les sous-titres d'alerte (couche signal) en diagnostics (squiggle + panneau Problèmes). */
export function buildDiagnostics(alerts: readonly Subtitle[]): vscode.Diagnostic[] {
  return alerts.map((s) => {
    const range = new vscode.Range(
      s.range.startPosition.row,
      s.range.startPosition.column,
      s.range.endPosition.row,
      s.range.endPosition.column,
    );
    const diag = new vscode.Diagnostic(range, s.text, vscode.DiagnosticSeverity.Warning);
    diag.source = 'LexLuthor';
    return diag;
  });
}
