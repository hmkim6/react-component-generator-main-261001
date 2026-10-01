// 업스트림 AI API의 SSE(text/event-stream) 응답을 청크 단위로 받아 data 페이로드를 꺼내는 파서.
// 네트워크 청크는 이벤트 경계와 무관하게 잘려 오므로, 빈 줄로 끝난 이벤트만 내보내고 나머지는 버퍼에 둔다.
export function createSSEParser(): { feed: (chunk: string) => string[] } {
  let buffer = '';

  return {
    feed: (chunk) => {
      buffer += chunk.replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      return events.flatMap((event) =>
        event
          .split('\n')
          .filter((line) => line.startsWith('data: '))
          .map((line) => line.slice('data: '.length)),
      );
    },
  };
}
