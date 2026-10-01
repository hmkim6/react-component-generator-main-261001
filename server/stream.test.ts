import { describe, it, expect } from 'vitest';
import { anthropicDeltaText, geminiDeltaText, relayTextStream, toNDJSONStream } from './stream';

function bodyFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

const delta = (text: string) =>
  `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`;

describe('relayTextStream', () => {
  it('청크로 나뉘어 온 SSE 본문에서 텍스트 조각을 순서대로 내보낸다', async () => {
    const event = delta('Card');
    const body = bodyFrom([delta('const '), event.slice(0, 10), event.slice(10)]);

    expect(await collect(relayTextStream(body, anthropicDeltaText))).toEqual(['const ', 'Card']);
  });

  it('텍스트가 없는 이벤트는 내보내지 않는다', async () => {
    const body = bodyFrom([`data: {"type":"ping"}\n\n`, delta('A')]);

    expect(await collect(relayTextStream(body, anthropicDeltaText))).toEqual(['A']);
  });
});

async function* fromArray(items: string[], failAfter?: Error) {
  for (const item of items) yield item;
  if (failAfter) throw failAfter;
}

async function readLines(stream: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const text = await new Response(stream).text();
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('toNDJSONStream', () => {
  it('조각마다 delta 줄을, 끝에 전체 텍스트를 정규화한 done 줄을 내보낸다', async () => {
    const stream = toNDJSONStream(fromArray(['```jsx\n', 'A']), (full) => `final:${full}`);

    expect(await readLines(stream)).toEqual([
      { type: 'delta', text: '```jsx\n' },
      { type: 'delta', text: 'A' },
      { type: 'done', code: 'final:```jsx\nA' },
    ]);
  });

  it('스트림 도중 에러가 나면 error 줄을 내보내고 done 없이 끝낸다', async () => {
    const stream = toNDJSONStream(fromArray(['A'], new Error('Claude API stream error: overloaded_error')), (f) => f);

    expect(await readLines(stream)).toEqual([
      { type: 'delta', text: 'A' },
      { type: 'error', error: 'Claude API stream error: overloaded_error' },
    ]);
  });
});

describe('anthropicDeltaText', () => {
  it('text_delta 이벤트의 텍스트를 반환한다', () => {
    const payload = JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: 'const Card' },
    });
    expect(anthropicDeltaText(payload)).toBe('const Card');
  });

  it('텍스트가 없는 이벤트(message_start, ping 등)는 빈 문자열을 반환한다', () => {
    expect(anthropicDeltaText(JSON.stringify({ type: 'message_start', message: {} }))).toBe('');
    expect(anthropicDeltaText(JSON.stringify({ type: 'ping' }))).toBe('');
  });

  it('스트림 중 error 이벤트가 오면 에러 종류를 담아 던진다', () => {
    const payload = JSON.stringify({
      type: 'error',
      error: { type: 'overloaded_error', message: 'Overloaded' },
    });
    expect(() => anthropicDeltaText(payload)).toThrow('overloaded_error');
  });

  it('max_tokens로 응답이 잘리면 안내 메시지와 함께 던진다', () => {
    const payload = JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'max_tokens' } });
    expect(() => anthropicDeltaText(payload)).toThrow('잘렸습니다');
  });
});

describe('geminiDeltaText', () => {
  it('첫 후보의 parts 텍스트를 이어 붙여 반환한다', () => {
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'const ' }, { text: 'Card' }] } }],
    });
    expect(geminiDeltaText(payload)).toBe('const Card');
  });

  it('후보나 parts가 없는 청크는 빈 문자열을 반환한다', () => {
    expect(geminiDeltaText(JSON.stringify({ usageMetadata: {} }))).toBe('');
    expect(geminiDeltaText(JSON.stringify({ candidates: [{ finishReason: 'STOP' }] }))).toBe('');
  });

  it('finishReason이 MAX_TOKENS면 안내 메시지와 함께 던진다', () => {
    const payload = JSON.stringify({
      candidates: [{ content: { parts: [{ text: '...' }] }, finishReason: 'MAX_TOKENS' }],
    });
    expect(() => geminiDeltaText(payload)).toThrow('잘렸습니다');
  });
});
