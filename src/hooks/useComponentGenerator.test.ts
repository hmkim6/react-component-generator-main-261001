import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';
import { loadJSON, saveJSON } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/persisted';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator', () => {
  it('localStorage에 저장된 컴포넌트 목록으로 시작한다', () => {
    saveJSON(STORAGE_KEYS.components, [
      { id: '1', prompt: '카드', code: 'render(<A />);', createdAt: '2026-10-01T09:30:00Z' },
    ]);

    const { result } = renderHook(() => useComponentGenerator());

    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('생성에 성공하면 새 컴포넌트를 localStorage에 저장한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ code: 'render(<Card />);' })),
    );
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('프로필 카드', undefined, 'google'));

    const stored = loadJSON<{ prompt: string }[]>(STORAGE_KEYS.components, []);
    expect(stored.map((c) => c.prompt)).toEqual(['프로필 카드']);
  });
});
