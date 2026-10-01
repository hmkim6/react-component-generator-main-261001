import { describe, it, expect } from 'vitest';
import { createSSEParser } from './sse';

describe('createSSEParser', () => {
  it('완성된 이벤트의 data 페이로드를 반환한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: {"a":1}\n\n')).toEqual(['{"a":1}']);
  });

  it('청크 경계에서 잘린 이벤트는 다음 청크와 이어 붙여 반환한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: {"te')).toEqual([]);
    expect(parser.feed('xt":"hi"}\n\n')).toEqual(['{"text":"hi"}']);
  });

  it('CRLF 줄바꿈으로 구분된 이벤트도 파싱한다', () => {
    const parser = createSSEParser();
    expect(parser.feed('data: {"a":1}\r\n\r\ndata: {"b":2}\r\n\r\n')).toEqual(['{"a":1}', '{"b":2}']);
  });
});
