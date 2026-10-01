import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadJSON, saveJSON } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadJSON', () => {
  it('저장된 값이 없으면 fallback을 반환한다', () => {
    expect(loadJSON('missing', ['기본'])).toEqual(['기본']);
  });

  it('saveJSON으로 저장한 값을 그대로 읽어온다', () => {
    saveJSON('history', ['프로필 카드', '검색 바']);
    expect(loadJSON('history', [])).toEqual(['프로필 카드', '검색 바']);
  });

  it('저장된 값이 깨진 JSON이면 fallback을 반환한다', () => {
    localStorage.setItem('history', '{not json');
    expect(loadJSON('history', [])).toEqual([]);
  });

  it('localStorage 읽기가 예외를 던지면 fallback을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(loadJSON('history', [])).toEqual([]);
  });
});

describe('saveJSON', () => {
  it('localStorage 쓰기가 예외를 던져도(용량 초과 등) 에러를 밖으로 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveJSON('components', [{ code: 'x' }])).not.toThrow();
  });
});
