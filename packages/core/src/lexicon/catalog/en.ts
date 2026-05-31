// English catalog : resolves each message key to an English sentence. Function
// entries compose prose via the per-locale helpers. Complete (no VO in EN).
import type { Catalog, LocaleHelpers, MsgParams } from '../../engine/message';

const S = (v: unknown): string => String(v ?? '');
const srcEn = (src: unknown): string => (src === 'array' ? 'an array' : 'an object');

function subject(p: MsgParams, h: LocaleHelpers): string {
  return p.glossed ? h.nounPhrase(S(p.subjectWords), 'def') : S(p.raw);
}

function condInner(p: MsgParams, h: LocaleHelpers, max: number): string {
  switch (p.kind) {
    case 'compare':
      return `${S(p.left)} ${h.comparison(S(p.op)) ?? S(p.op)} ${S(p.right)}`;
    case 'membership':
      return `the collection contains ${p.what ? h.demonstrative(S(p.what)) : 'this item'}`;
    case 'arrayPred':
      return h.sub(`cond.arrayPred.${S(p.pred)}`);
    case 'is':
      return `${h.nounPhrase(S(p.subj), 'def')} is ${h.adjective(S(p.adj)) ?? S(p.adj)}`;
    case 'has':
      return `${h.nounPhrase(S(p.subj), 'def')} has ${h.nounPhrase(S(p.rest), 'indef')}`;
    case 'canShould':
      return `${h.nounPhrase(S(p.subj), 'def')} ${p.mood === 'should' ? 'should' : 'can'} ${h.infinitive(S(p.inf)) ?? S(p.inf)}`;
    default:
      return h.truncate(S(p.text), max);
  }
}

function exprRead(p: MsgParams, h: LocaleHelpers): string {
  switch (p.kind) {
    case 'subscriptLookup':
      return `get ${h.nounPhrase(S(p.obj), 'def', { singular: true })} for ${h.demonstrative(S(p.index))}`;
    case 'new':
      return `create ${h.nounPhrase(S(p.ctor), 'indef')}`;
    case 'collectionLookup': {
      const base = `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.obj), 'def', { singular: true })}`;
      return p.index ? `${base} for ${h.demonstrative(S(p.index))}` : base;
    }
    case 'collectionStore':
      return `store ${h.nounPhrase(S(p.obj), 'def', { singular: true })} for ${h.demonstrative(S(p.index))}`;
    case 'verbLookupKey':
      return `${h.readVerb(S(p.name)) ?? ''} for ${h.demonstrative(S(p.index))}`;
    case 'verbObject':
      return `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.arg), 'def')}`;
    case 'verbSubject':
      return `${h.readVerb(S(p.name)) ?? ''} ${h.nounPhrase(S(p.subject), 'def')}`;
    default:
      return h.readVerb(S(p.name)) ?? '';
  }
}

function complement(p: MsgParams, h: LocaleHelpers): string {
  switch (p.ck) {
    case 'name':
      return h.nounPhrase(S(p.cw), 'def');
    case 'text':
      return h.truncate(S(p.ct), 30);
    case 'object':
      return 'an object';
    case 'array':
      return 'a list';
    default:
      return 'a value';
  }
}

function shapeDefine(p: MsgParams, h: LocaleHelpers): string {
  const subj = subject(p, h);
  const text = S(p.text);
  switch (p.shape) {
    case 'literal':
    case 'member':
    case 'name':
      return `We set ${subj} to ${text}`;
    case 'template':
      return `We compose ${subj}`;
    case 'ternary':
    case 'logical':
      return `We set ${subj} based on a condition`;
    case 'nullish':
      return `We set ${subj}, with a default value`;
    case 'compare':
      return `We set ${subj} from a comparison`;
    case 'arith':
      return `We compute ${subj}`;
    case 'negation':
      return `We set ${subj} from a negation`;
    default:
      return `We set ${subj}`;
  }
}

function shapeReturn(p: MsgParams): string {
  const text = S(p.text);
  switch (p.shape) {
    case 'literal':
    case 'member':
    case 'name':
      return `We return ${text}`;
    case 'object':
      return 'We return an object';
    case 'array':
      return 'We return a list';
    case 'template':
      return 'We return a composed string';
    case 'ternary':
    case 'logical':
      return 'We return a value based on a condition';
    case 'nullish':
      return 'We return a value or its default';
    case 'compare':
      return 'We return the result of a comparison';
    case 'arith':
      return 'We return the result of a computation';
    case 'negation':
      return 'We return the result of a negation';
    default:
      return 'We return the result';
  }
}

export const catalogEn: Catalog = {
  // --- Signal (alerts) ---
  'signal.eval': '⚠ Runs arbitrary code (eval), a common attack vector',
  'signal.functionCtor': '⚠ Builds and runs code on the fly (Function)',
  'signal.base64': '⚠ Decodes base64 data (often used to hide a payload)',
  'signal.dynamicCall': '⚠ Call via chained dynamic access (possible obfuscation)',
  'signal.childProcess': '⚠ Access to system commands (child_process)',

  // --- Conditions / loops / flow ---
  'cond.ifNotExistsGlossed': (p, h) => `If ${h.noneOf(S(p.words))} exists:`,
  'cond.ifNotExists': (p, h) => `If ${h.truncate(S(p.subject), 40)} doesn't exist:`,
  'cond.if': (p, h) => `If ${condInner(p, h, 50)}:`,
  'cond.while': (p, h) => `While ${condInner(p, h, 50)}:`,
  'cond.switch': (p, h) => `Depending on ${condInner(p, h, 40)}:`,
  'cond.arrayPred.some': 'at least one item matches',
  'cond.arrayPred.every': 'all items match',
  'cond.arrayPred.find': 'an item matches',
  'loop.forOf': (p, h) =>
    `For each ${p.v ? h.truncate(S(p.v), 30) : 'item'} in ${p.it ? h.truncate(S(p.it), 30) : 'the collection'}:`,
  'loop.forIn': (p, h) =>
    `For each key ${p.v ? h.truncate(S(p.v), 30) : 'item'} in ${p.it ? h.truncate(S(p.it), 30) : 'the collection'}:`,
  'loop.forClassic': 'We loop repeatedly:',
  'flow.try': 'We attempt the following:',
  'flow.catch': (p) => `On error${p.param ? ` (${S(p.param)})` : ''}:`,

  // --- Declarations / values ---
  'decl.destructure': (p) =>
    p.names ? `We extract ${S(p.names)} from ${srcEn(p.src)}` : `We unpack the values from ${srcEn(p.src)}`,
  'decl.declare': (p, h) => `We declare ${subject(p, h)}`,
  'expr.read': (p, h) => `We ${exprRead(p, h)}`,
  'shape.define': (p, h) => shapeDefine(p, h),
  'shape.return': (p) => shapeReturn(p),
  'assign.collection': (p, h) =>
    `We ${p.isCache ? `cache ${complement(p, h)}` : `store ${complement(p, h)}`}${p.index ? ` for ${h.demonstrative(S(p.index))}` : ''}`,
  'assign.field': (p, h) => `We set ${h.nounPhrase(S(p.prop), 'def')} to ${complement(p, h)}`,
  'assign.fieldOf': (p, h) =>
    `We set ${h.nounPhrase(S(p.prop), 'def')} of ${h.nounPhrase(S(p.obj), 'none')} to ${complement(p, h)}`,
  'return.void': 'We exit the function',
  'return.value': (p, h) => `We return ${subject(p, h)}`,
  'throw.error': 'We throw an error',
  'throw.errorShown': (p) => `We throw an error: ${S(p.text)}`,

  // --- Imports / exports ---
  'import.module': 'We import the {mod} module',
  'import.namespace': (p) => `We import the whole ${S(p.mod)} module${p.alias ? ` (as ${S(p.alias)})` : ''}`,
  'import.named': 'We import {names} from the {mod} module',
  'import.default': 'We import {name} from the {mod} module',
  'export.named': 'We expose {names}',
  'export.reexport': 'We re-export {names} from the {mod} module',
  'export.reexportAll': 'We re-export the whole {mod} module',
  'export.defaultNamed': 'We expose {name} by default',
  'export.default': 'We expose the default value',

  // --- Functions ---
  'func.intent': (p, h) => `We ${h.readVerb(S(p.name)) ?? ''}`,
  'func.define': (p) => `We define the${p.async ? ' async' : ''} function ${S(p.name)}`,
  'func.methodIntent': (p, h) => `We ${h.readVerb(S(p.name)) ?? ''}`,
  'func.methodDefine': 'We define the {name} method',
  'func.constructor': 'When the object is created:',
  'func.iife': (p) => `We immediately run a${p.async ? 'n async' : ''} function:`,

  // --- Promises / collections / console ---
  'promise.rejectError': 'We reject with an error',
  'promise.reject': 'We reject the promise',
  'array.map': 'We transform each item in the collection',
  'array.filter': 'We keep only the items that meet a condition',
  'array.reduce': 'We combine all items into a single value',
  'array.forEach': 'We go through each item one by one',
  'array.find': 'We find the first item that matches',
  'array.some': 'We check whether at least one item matches',
  'array.every': 'We check whether all items match',
  'array.push': 'We add an item to the collection',
  'array.pop': 'We remove the last item from the collection',
  'array.shift': 'We remove the first item from the collection',
  'array.unshift': 'We add an item to the start of the collection',
  'array.includesCheck': 'We check whether the collection contains this item',
  'console.message': 'We print a message to the console',
  'console.warn': 'We print a warning to the console',
  'console.error': 'We print an error to the console',

  // --- new ---
  'new.map': 'We create an in-memory store (key to value)',
  'new.set': 'We create a set (unique values)',
  'new.array': 'We create an array',
  'new.date': 'We create a date',
  'new.promise': 'We create a promise (async operation)',
  'new.regexp': 'We create a regular expression',

  // --- HTTP / Express ---
  'http.respondStatus': (p, h) => `We respond: ${h.sub(`http.status.${S(p.code)}`)} (${S(p.code)})`,
  'http.respondStatusRaw': (p) => `We respond with status ${S(p.code)}`,
  'http.respondJson': 'We return the data as JSON',
  'http.respondSend': 'We send the response',
  'http.route': (p, h) => `When a ${h.sub(`http.method.${S(p.method)}`)} request comes in on ${S(p.path)}`,
  'http.listen': 'We start the server on port {port}',
  'http.status.200': 'all good',
  'http.status.201': 'created',
  'http.status.202': 'accepted',
  'http.status.204': 'nothing to return',
  'http.status.301': 'moved permanently',
  'http.status.302': 'redirected',
  'http.status.304': 'unchanged',
  'http.status.400': 'bad request',
  'http.status.401': 'not authenticated',
  'http.status.403': 'access denied',
  'http.status.404': 'not found',
  'http.status.409': 'conflict',
  'http.status.422': 'invalid data',
  'http.status.429': 'too many requests',
  'http.status.500': 'server error',
  'http.status.502': 'bad gateway',
  'http.status.503': 'service unavailable',
  'http.method.get': 'GET (read)',
  'http.method.post': 'POST (create)',
  'http.method.put': 'PUT (replace)',
  'http.method.patch': 'PATCH (update)',
  'http.method.delete': 'DELETE (remove)',

  // --- Utilities ---
  'json.parse': 'We turn JSON text into an object',
  'json.stringify': 'We turn a value into JSON text',
  'fs.read': 'We read the contents of a file',
  'fs.readDir': 'We list the contents of a directory',
  'fs.write': 'We write to a file',
  'fs.exists': 'We check whether a file exists',
  'fs.mkdir': 'We create a directory',
  'fs.unlink': 'We delete a file',
  'path.assemble': 'We build a file path',
  'object.keys': "We get the object's keys",
  'object.values': "We get the object's values",
  'object.entries': "We get the object's key-value pairs",
  'dom.event': (p) => `When the ${S(p.evt)} event fires, we react`,
  'react.useState': 'We create reactive local state',
  'react.useEffect': 'We run an effect (on render or when a dependency changes)',
  'react.useRef': 'We keep a persistent reference across renders',
  'react.useMemo': 'We memoize a computed value',
  'react.useCallback': 'We memoize a stable function across renders',
  'react.useContext': 'We read a shared value (React context)',
  'commonjs.exports': 'We export (make available outside the module)',

  // --- TypeScript ---
  'ts.interface': (p) => `We define the ${S(p.name)} interface (the shape of an object)`,
  'ts.typeAlias': 'We define the {name} type',
  'ts.enum': (p) => `We define the ${S(p.name)} enum (a set of named values)`,
};
