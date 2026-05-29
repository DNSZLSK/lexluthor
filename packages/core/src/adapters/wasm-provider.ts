import type { Language } from 'web-tree-sitter';
import type { LangId } from '../engine/types';

/**
 * Abstraction du chargement WASM (inversion de dépendance). Le coeur ne connaît
 * plus son environnement : chaque hôte fournit son implémentation —
 *  - navigateur : URL `/wasm/*.wasm` + `Parser.init({locateFile})` ;
 *  - Node / extension VS Code : `fs`/`workspace.fs.readFile` via `extensionUri`.
 */
export interface WasmProvider {
  /** Initialise le moteur web-tree-sitter (charge le .wasm moteur). Idempotent. */
  initEngine(): Promise<void>;
  /** Charge la grammaire d'un langage et renvoie l'objet `Language` tree-sitter. */
  loadGrammar(lang: LangId): Promise<Language>;
}
