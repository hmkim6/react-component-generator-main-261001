// 프로바이더별 스트리밍 이벤트(JSON 문자열)에서 생성된 텍스트 조각을 꺼내는 순수 함수들과,
// 업스트림 SSE 본문을 클라이언트용 NDJSON 스트림으로 바꾸는 변환기.
import { createSSEParser } from './sse';

export const TRUNCATED_MESSAGE =
  '생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.';

export function anthropicDeltaText(payload: string): string {
  const event = JSON.parse(payload);
  if (event.type === 'error') {
    throw new Error(`Claude API stream error: ${event.error?.type ?? 'unknown'}`);
  }
  if (event.type === 'message_delta' && event.delta?.stop_reason === 'max_tokens') {
    throw new Error(TRUNCATED_MESSAGE);
  }
  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
    return event.delta.text;
  }
  return '';
}

export function geminiDeltaText(payload: string): string {
  const chunk = JSON.parse(payload);
  if (chunk.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw new Error(TRUNCATED_MESSAGE);
  }
  const parts: Array<{ text?: string }> = chunk.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('');
}

export async function* relayTextStream(
  body: ReadableStream<Uint8Array>,
  extract: (payload: string) => string,
): AsyncGenerator<string> {
  const parser = createSSEParser();
  const decoder = new TextDecoder();
  const reader = body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const payload of parser.feed(decoder.decode(value, { stream: true }))) {
      const text = extract(payload);
      if (text) yield text;
    }
  }
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

export function toNDJSONStream(
  deltas: AsyncIterable<string>,
  finalize: (fullText: string) => string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const line = (event: StreamEvent) => encoder.encode(`${JSON.stringify(event)}\n`);

  return new ReadableStream({
    async start(controller) {
      // 응답 헤더(200)는 이미 나갔으므로, 도중 에러는 HTTP 상태가 아니라 error 줄로 알린다.
      let fullText = '';
      try {
        for await (const text of deltas) {
          fullText += text;
          controller.enqueue(line({ type: 'delta', text }));
        }
        controller.enqueue(line({ type: 'done', code: finalize(fullText) }));
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(line({ type: 'error', error }));
      }
      controller.close();
    },
  });
}
