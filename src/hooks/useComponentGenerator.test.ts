import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

// 테스트가 이벤트를 하나씩 흘려보낼 수 있는 NDJSON 스트림 응답
function streamingResponse() {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();
  return {
    response: new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } }),
    send: (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
    close: () => controller.close(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator 스트리밍', () => {
  it('생성을 시작하면 스트리밍 중인 빈 컴포넌트를 목록 맨 앞에 추가한다', async () => {
    const stream = streamingResponse();
    vi.stubGlobal('fetch', vi.fn(async () => stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('프로필 카드', undefined, 'google');
    });

    await waitFor(() => expect(result.current.components).toHaveLength(1));
    expect(result.current.components[0]).toMatchObject({
      prompt: '프로필 카드',
      code: '',
      isStreaming: true,
    });
  });

  it('delta가 도착할 때마다 해당 컴포넌트의 코드에 이어 붙인다', async () => {
    const stream = streamingResponse();
    vi.stubGlobal('fetch', vi.fn(async () => stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('프로필 카드', undefined, 'google');
    });
    act(() => {
      stream.send({ type: 'delta', text: 'const Card' });
      stream.send({ type: 'delta', text: ' = () => null;' });
    });

    await waitFor(() => expect(result.current.components[0].code).toBe('const Card = () => null;'));
    expect(result.current.components).toHaveLength(1);
    expect(result.current.components[0].isStreaming).toBe(true);
  });

  it('done이 오면 코드를 서버가 정규화한 완성본으로 바꾸고 스트리밍을 끝낸다', async () => {
    const stream = streamingResponse();
    vi.stubGlobal('fetch', vi.fn(async () => stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('프로필 카드', undefined, 'google');
    });
    act(() => {
      stream.send({ type: 'delta', text: '```jsx\nconst Card = () => null;' });
      stream.send({ type: 'done', code: 'const Card = () => null;\n\nrender(<Card />);' });
      stream.close();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.components[0]).toMatchObject({
      code: 'const Card = () => null;\n\nrender(<Card />);',
      isStreaming: false,
    });
    expect(result.current.error).toBeNull();
  });

  it('스트림 도중 error 줄이 오면 만들던 컴포넌트를 지우고 에러를 보여준다', async () => {
    const stream = streamingResponse();
    vi.stubGlobal('fetch', vi.fn(async () => stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('프로필 카드', undefined, 'google');
    });
    act(() => {
      stream.send({ type: 'delta', text: 'const Card' });
      stream.send({ type: 'error', error: '생성된 코드가 너무 길어 잘렸습니다.' });
      stream.close();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.components).toEqual([]);
    expect(result.current.error).toBe('생성된 코드가 너무 길어 잘렸습니다.');
  });

  it('스트림을 열기 전에 서버가 에러 응답(JSON)을 주면 컴포넌트를 지우고 그 메시지를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 }),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());

    await act(() => result.current.generate('프로필 카드', undefined, 'google'));

    expect(result.current.components).toEqual([]);
    expect(result.current.error).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  });

  it('done 없이 스트림이 끊기면 컴포넌트를 지우고 중단 안내를 보여준다', async () => {
    const stream = streamingResponse();
    vi.stubGlobal('fetch', vi.fn(async () => stream.response));
    const { result } = renderHook(() => useComponentGenerator());

    act(() => {
      void result.current.generate('프로필 카드', undefined, 'google');
    });
    act(() => {
      stream.send({ type: 'delta', text: 'const Card' });
      stream.close();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.components).toEqual([]);
    expect(result.current.error).toBe('응답이 중간에 끊겼습니다. 다시 시도해주세요.');
  });
});
