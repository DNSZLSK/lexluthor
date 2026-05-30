// Token de coloration syntaxique : contrat minimal, sans dependance au coloriseur
// concret (Shiki aujourd'hui, Prism en plan B). interleave reste ainsi pur et testable.
export interface Token {
  readonly content: string;
  readonly color?: string;
}
