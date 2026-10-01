import { useState, useCallback, useEffect } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { createNDJSONParser } from '../utils/ndjson';
import { loadJSON, saveJSON } from '../utils/storage';
import { STORAGE_KEYS, parseComponents } from '../utils/persisted';

// 서버 /api/generate/stream 이 한 줄씩 보내는 이벤트 (server/stream.ts의 StreamEvent와 같은 형식)
type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  isLoading: boolean;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useState<GeneratedComponent[]>(() =>
    parseComponents(loadJSON(STORAGE_KEYS.components, [])),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveJSON(STORAGE_KEYS.components, components);
  }, [components]);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setComponents((prev) => [
      { id, prompt, code: '', createdAt: new Date(), isStreaming: true },
      ...prev,
    ]);

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      // 스트림을 열기 전 실패(키 없음, 429/503 등)는 기존처럼 { error } JSON으로 온다.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createNDJSONParser<StreamEvent>();
      let completed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const event of parser.feed(decoder.decode(value, { stream: true }))) {
          if (event.type === 'delta') {
            setComponents((prev) =>
              prev.map((c) => (c.id === id ? { ...c, code: c.code + event.text } : c)),
            );
          } else if (event.type === 'done') {
            completed = true;
            setComponents((prev) =>
              prev.map((c) => (c.id === id ? { ...c, code: event.code, isStreaming: false } : c)),
            );
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }

      // 네트워크 단절 등으로 done 없이 끝난 응답은 미완성 코드라 실패로 처리한다.
      if (!completed) {
        throw new Error('응답이 중간에 끊겼습니다. 다시 시도해주세요.');
      }
    } catch (err) {
      // 실패한 생성은 미완성 코드를 남기지 않는다. 깨진 코드가 미리보기에서 실행되는 것을 막기 위해서다.
      setComponents((prev) => prev.filter((c) => c.id !== id));
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, []);

  return { components, isLoading, error, generate, removeComponent, clearAll };
}
