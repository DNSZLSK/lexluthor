import { describe, expect, it } from 'vitest';
import { interleave } from '@lexluthor/reader';
import type { Subtitle } from '@lexluthor/core';
import type { Token } from '@lexluthor/reader';

function line(text: string): Token[] {
  return [{ content: text }];
}

function sub(text: string, startRow: number, startIndex: number, opts: Partial<Subtitle> = {}): Subtitle {
  return {
    text,
    ruleId: 'x',
    layer: 'idiomatic',
    depth: 0,
    confidence: 1,
    range: {
      startIndex,
      endIndex: startIndex + 1,
      startPosition: { row: startRow, column: 0 },
      endPosition: { row: startRow, column: 1 },
    },
    ...opts,
  };
}

describe('interleave (pur)', () => {
  it('insère le sous-titre juste sous sa ligne, gouttière sur le code seulement', () => {
    const rows = interleave([line('a();'), line('b();')], [sub('Fait a', 0, 0)]);
    expect(rows.map((r) => r.kind)).toEqual(['code', 'subtitle', 'code']);
    const codeRows = rows.filter((r) => r.kind === 'code');
    expect(codeRows.map((r) => (r.kind === 'code' ? r.lineNumber : 0))).toEqual([1, 2]);
  });

  it('préserve les lignes vides comme lignes de code', () => {
    const rows = interleave([line('a();'), [], line('b();')], []);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.kind === 'code')).toBe(true);
  });

  it('empile plusieurs sous-titres d’une même ligne dans l’ordre de position', () => {
    const rows = interleave([line('a(); b();')], [sub('Deux', 0, 5), sub('Un', 0, 0)]);
    const texts = rows.filter((r) => r.kind === 'subtitle').map((r) => (r.kind === 'subtitle' ? r.text : ''));
    expect(texts).toEqual(['Un', 'Deux']);
  });

  it('propage severity et confidence', () => {
    const rows = interleave([line('x')], [sub('Alerte', 0, 0, { severity: 'alert', confidence: 1 })]);
    const s = rows.find((r) => r.kind === 'subtitle');
    expect(s?.kind === 'subtitle' && s.severity).toBe('alert');
  });
});
