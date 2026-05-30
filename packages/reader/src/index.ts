// Rendu VOSTFR partagé. L'import des styles est un effet de bord : tout consommateur
// (webapp Vite, webview esbuild) récupère le CSS en important ce paquet.
import './styles/theme.css';
import './styles/player.css';

export { createReaderHighlighter } from './highlighter';
export type { ReaderHighlighter } from './highlighter';
export { interleave } from './interleave';
export type { RenderRow } from './interleave';
export { renderPlayer } from './render';
export type { Token } from './tokens';
