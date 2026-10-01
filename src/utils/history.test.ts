import { describe, it, expect } from 'vitest';
import { addToHistory, MAX_HISTORY } from './history';

describe('addToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addToHistory(['검색 바'], '프로필 카드')).toEqual(['프로필 카드', '검색 바']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addToHistory(['A', 'B', 'C'], 'B')).toEqual(['B', 'A', 'C']);
  });

  it(`최대 ${MAX_HISTORY}개까지만 보관하고 가장 오래된 항목을 버린다`, () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => `프롬프트 ${i}`);
    const result = addToHistory(full, '새 프롬프트');
    expect(result).toHaveLength(MAX_HISTORY);
    expect(result[0]).toBe('새 프롬프트');
    expect(result).not.toContain(`프롬프트 ${MAX_HISTORY - 1}`);
  });
});
