// Point d'entrée public de @lexluthor/core. Agnostique à l'hôte : aucun import DOM/Node.
// La webapp et l'extension VS Code consomment tout d'ici.
export type {
  Subtitle,
  LangId,
  SourceRange,
  Point,
  RuleLayer,
  Severity,
  Rule,
  RuleContext,
  RuleExample,
  ClaimKind,
  Interpolator,
  LanguageAdapter,
  SubtitleEngine,
  SyntaxNode,
} from './engine/types';

export { createEngine } from './engine/engine';
export { interpolator } from './engine/interpolate';

export { createJavaScriptAdapter } from './adapters/javascript';
export { createTypeScriptAdapter } from './adapters/typescript';
export {
  createTreeSitterAdapter,
  SHARED_BLOCK_TYPES,
  SHARED_BODY_FIELDS,
  SHARED_FUNCTION_ARG_TYPES,
} from './adapters/factory';
export type { AdapterConfig } from './adapters/factory';

export type { WasmProvider } from './adapters/wasm-provider';
export { createSubtitler } from './subtitler';
export type { Subtitler } from './subtitler';

export { samples } from './data/samples';
export type { Sample } from './data/samples';

// Mode diagnostic (outil de curation `lexluthor scan`) : déterministe, pur.
export { analyzeCoverage, mergeReport, emptyRepoReport, topN } from './diagnostics/coverage';
export type { FileReport, RepoReport, Coverage, Ranked, RecopiedBucket } from './diagnostics/coverage';
export { isCodeRecopied, dominantToken } from './diagnostics/recopy';
