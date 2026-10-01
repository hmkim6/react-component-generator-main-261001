import { describe, it, expect } from 'vitest';
import { createNDJSONParser } from './ndjson';

describe('createNDJSONParser', () => {
  it('완성된 줄을 JSON 객체로 반환한다', () => {
    const parser = createNDJSONParser();
    expect(parser.feed('{"type":"delta","text":"A"}\n{"type":"delta","text":"B"}\n')).toEqual([
      { type: 'delta', text: 'A' },
      { type: 'delta', text: 'B' },
    ]);
  });

  it('줄 중간에서 잘린 청크는 다음 청크와 이어 붙여 파싱한다', () => {
    const parser = createNDJSONParser();
    expect(parser.feed('{"type":"del')).toEqual([]);
    expect(parser.feed('ta","text":"A"}\n')).toEqual([{ type: 'delta', text: 'A' }]);
  });
});
