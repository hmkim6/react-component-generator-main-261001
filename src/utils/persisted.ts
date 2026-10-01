import type { GeneratedComponent, Provider } from '../types';

// 키를 바꾸면 기존 사용자의 저장 데이터가 사라진다. 형식이 바뀌면 버전 접미사를 올린다.
export const STORAGE_KEYS = {
  provider: 'rcg:provider:v1',
  history: 'rcg:prompt-history:v1',
  components: 'rcg:components:v1',
} as const;

const PROVIDERS: Provider[] = ['anthropic', 'google'];
export const DEFAULT_PROVIDER: Provider = 'google';

export function parseProvider(value: unknown): Provider {
  return PROVIDERS.includes(value as Provider) ? (value as Provider) : DEFAULT_PROVIDER;
}

export function parseHistory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export function parseComponents(value: unknown): GeneratedComponent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      typeof item?.id !== 'string' ||
      typeof item.prompt !== 'string' ||
      typeof item.code !== 'string'
    ) {
      return [];
    }
    const createdAt = new Date(item.createdAt);
    if (Number.isNaN(createdAt.getTime())) return [];
    return [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
  });
}
