import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePromptHistory } from './usePromptHistory';
import { loadJSON, saveJSON } from '../utils/storage';
import { STORAGE_KEYS } from '../utils/persisted';

describe('usePromptHistory', () => {
  it('localStorage에 저장된 히스토리로 시작한다', () => {
    saveJSON(STORAGE_KEYS.history, ['프로필 카드', '검색 바']);

    const { result } = renderHook(() => usePromptHistory());

    expect(result.current.history).toEqual(['프로필 카드', '검색 바']);
  });

  it('추가한 프롬프트를 맨 앞에 두고 localStorage에 저장한다', () => {
    saveJSON(STORAGE_KEYS.history, ['검색 바']);
    const { result } = renderHook(() => usePromptHistory());

    act(() => result.current.addPrompt('프로필 카드'));

    expect(result.current.history).toEqual(['프로필 카드', '검색 바']);
    expect(loadJSON(STORAGE_KEYS.history, [])).toEqual(['프로필 카드', '검색 바']);
  });

  it('항목 하나를 삭제하면 나머지만 저장한다', () => {
    saveJSON(STORAGE_KEYS.history, ['A', 'B', 'C']);
    const { result } = renderHook(() => usePromptHistory());

    act(() => result.current.removePrompt('B'));

    expect(loadJSON(STORAGE_KEYS.history, [])).toEqual(['A', 'C']);
  });

  it('전체 지우기를 하면 빈 히스토리를 저장한다', () => {
    saveJSON(STORAGE_KEYS.history, ['A', 'B']);
    const { result } = renderHook(() => usePromptHistory());

    act(() => result.current.clearHistory());

    expect(loadJSON(STORAGE_KEYS.history, null)).toEqual([]);
  });
});
