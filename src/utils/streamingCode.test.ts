import { describe, it, expect } from 'vitest';
import { toStreamingDisplay } from './streamingCode';

describe('toStreamingDisplay', () => {
  it('맨 앞의 언어 태그 붙은 코드펜스 줄을 제거한다', () => {
    expect(toStreamingDisplay('```jsx\nconst Card = () => {')).toBe('const Card = () => {');
  });

  it('펜스 줄이 아직 덜 도착했으면(줄바꿈 전) 빈 문자열을 보여준다', () => {
    expect(toStreamingDisplay('```js')).toBe('');
    expect(toStreamingDisplay('`')).toBe('');
  });

  it('끝에 붙은 닫는 펜스를 제거한다', () => {
    expect(toStreamingDisplay('```jsx\nrender(<Card />);\n```')).toBe('render(<Card />);\n');
  });
});
