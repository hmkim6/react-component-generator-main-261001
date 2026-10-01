// 서버가 한 줄에 JSON 하나씩 보내는 NDJSON 스트림을 청크 단위로 파싱한다.
// 네트워크 청크는 줄 경계와 무관하게 잘려 오므로, 마지막 미완성 줄은 다음 청크까지 버퍼에 둔다.
export function createNDJSONParser<T>(): { feed: (chunk: string) => T[] } {
  let buffer = '';

  return {
    feed: (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      return lines.filter(Boolean).map((line) => JSON.parse(line) as T);
    },
  };
}
