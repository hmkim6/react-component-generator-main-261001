export type Provider = 'anthropic' | 'google';

export interface GeneratedComponent {
  id: string;
  prompt: string;
  code: string;
  createdAt: Date;
  /** LLM 응답을 받는 중이면 true. code에는 지금까지 도착한 원문이 쌓인다. */
  isStreaming?: boolean;
}
