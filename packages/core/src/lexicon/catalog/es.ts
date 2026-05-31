// Catalogo ES (AMORCE). Las claves AUSENTES se omiten (VO) : un subtitulo en
// espanol solo aparece cuando su clave esta aqui. Se completa con la curacion ;
// catalog-completeness.spec lista las claves que faltan como deuda conocida.
import type { Catalog, LocaleHelpers, MsgParams } from '../../engine/message';

const S = (v: unknown): string => String(v ?? '');

function subject(p: MsgParams, h: LocaleHelpers): string {
  return p.glossed ? h.nounPhrase(S(p.subjectWords), 'def') : S(p.raw);
}

export const catalogEs: Catalog = {
  // --- Senal (alertas) : traducidas. ---
  'signal.eval': '⚠ Ejecuta código arbitrario (eval), un vector de ataque común',
  'signal.functionCtor': '⚠ Construye y ejecuta código al vuelo (Function)',
  'signal.base64': '⚠ Decodifica datos base64 (a menudo para ocultar una carga útil)',
  'signal.dynamicCall': '⚠ Llamada por acceso dinámico encadenado (posible ofuscación)',
  'signal.childProcess': '⚠ Acceso a comandos del sistema (child_process)',

  // --- Algunas claves de demostracion (el resto se omite en VO hasta su traduccion). ---
  'import.module': 'Importamos el módulo {mod}',
  'loop.forClassic': 'Repetimos en bucle:',
  'flow.try': 'Intentamos la siguiente operación:',
  'http.listen': 'Iniciamos el servidor en el puerto {port}',
  'return.void': 'Salimos de la función',
  'return.value': (p, h) => `Devolvemos ${subject(p, h)}`,
  'console.message': 'Mostramos un mensaje en la consola',
  'console.error': 'Mostramos un error en la consola',
};
