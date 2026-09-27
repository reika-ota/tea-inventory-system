import { describe, expect, it } from 'vitest';
import { MUTATION_ACTIONS, QUERY_ACTIONS, isAction, isMutationAction } from './actions';
import { ERROR_CODES, ERROR_MESSAGES } from './errors';

describe('action', () => {
  it('参照系と更新系で全15種類（重複なし）', () => {
    const all = [...QUERY_ACTIONS, ...MUTATION_ACTIONS];
    expect(all).toHaveLength(15);
    expect(new Set(all).size).toBe(15);
  });

  it('isAction は定義済みの action 名だけを受け付ける', () => {
    expect(isAction('consume')).toBe(true);
    expect(isAction('dropTable')).toBe(false);
    expect(isAction(undefined)).toBe(false);
  });

  it('isMutationAction は更新系だけ true', () => {
    expect(isMutationAction('consume')).toBe(true);
    expect(isMutationAction('getAll')).toBe(false);
  });
});

describe('エラーコード', () => {
  it('すべてのコードに利用者向けメッセージがある', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_MESSAGES[code]).not.toBe('');
    }
    expect(Object.keys(ERROR_MESSAGES)).toHaveLength(ERROR_CODES.length);
  });
});
