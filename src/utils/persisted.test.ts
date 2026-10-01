import { describe, it, expect } from 'vitest';
import { parseProvider, parseHistory, parseComponents } from './persisted';

describe('parseProvider', () => {
  it('저장된 값이 알려진 Provider면 그대로 반환한다', () => {
    expect(parseProvider('anthropic')).toBe('anthropic');
  });

  it('알 수 없는 값이면 기본 Provider(google)를 반환한다', () => {
    expect(parseProvider('openai')).toBe('google');
    expect(parseProvider(null)).toBe('google');
  });
});

describe('parseHistory', () => {
  it('문자열이 아닌 항목을 걸러낸 문자열 배열을 반환한다', () => {
    expect(parseHistory(['프로필 카드', 42, null, '검색 바'])).toEqual(['프로필 카드', '검색 바']);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseHistory({ 0: '프로필 카드' })).toEqual([]);
  });
});

describe('parseComponents', () => {
  it('JSON으로 문자열이 된 createdAt을 Date로 복원한다', () => {
    const stored = JSON.parse(
      JSON.stringify([
        { id: '1', prompt: '카드', code: 'render(<A />);', createdAt: new Date('2026-10-01T09:30:00Z') },
      ]),
    );

    const [component] = parseComponents(stored);

    expect(component.createdAt).toBeInstanceOf(Date);
    expect(component.createdAt.toISOString()).toBe('2026-10-01T09:30:00.000Z');
    expect(component).toMatchObject({ id: '1', prompt: '카드', code: 'render(<A />);' });
  });

  it('필수 필드가 빠졌거나 날짜가 잘못된 항목은 버린다', () => {
    const stored = [
      { id: '1', prompt: '카드', code: 'render(<A />);', createdAt: '2026-10-01T09:30:00Z' },
      { id: '2', prompt: '코드 없음', createdAt: '2026-10-01T09:30:00Z' },
      { id: '3', prompt: '날짜 깨짐', code: 'x', createdAt: 'not-a-date' },
      null,
    ];

    expect(parseComponents(stored).map((c) => c.id)).toEqual(['1']);
  });

  it('배열이 아니면 빈 배열을 반환한다', () => {
    expect(parseComponents('oops')).toEqual([]);
  });
});
