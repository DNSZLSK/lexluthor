// Verbos ES (AMORCE / seed). token -> 3a persona singular. La valencia y el caso vienen
// del registro compartido (VERB_META) ; aqui solo la palabra. Parcial : crece con la curacion.
import type { VerbEntry } from '../types';

const w = (word: string): VerbEntry => ({ word, valence: 'def' });

export const VERBS_ES: Readonly<Record<string, VerbEntry>> = {
  get: w('obtiene'),
  fetch: w('obtiene'),
  read: w('lee'),
  load: w('carga'),
  write: w('escribe'),
  save: w('guarda'),
  store: w('guarda'),
  create: w('crea'),
  make: w('crea'),
  build: w('construye'),
  init: w('inicializa'),
  ensure: w('se asegura'),
  set: w('define'),
  update: w('actualiza'),
  find: w('busca'),
  search: w('busca'),
  handle: w('gestiona'),
  validate: w('valida'),
  check: w('verifica'),
  verify: w('verifica'),
  parse: w('analiza'),
  send: w('envía'),
  delete: w('elimina'),
  remove: w('elimina'),
  start: w('inicia'),
  stop: w('detiene'),
  run: w('ejecuta'),
  execute: w('ejecuta'),
  subscribe: w('se suscribe'),
};

/** Verbo para la convencion *Of (claimOf -> "determina la reivindicacion"). */
export const DETERMINE_ES = 'determina';
