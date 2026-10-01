import { describe, it, expect } from 'vitest';
import { validatePrompt, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePrompt', () => {
  it('500자 이하의 프롬프트는 유효하다', () => {
    const result = validatePrompt('가'.repeat(MAX_PROMPT_LENGTH));
    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('500자를 넘으면 무효이고 현재 길이를 담은 에러 메시지를 준다', () => {
    const result = validatePrompt('가'.repeat(MAX_PROMPT_LENGTH + 1));
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('프롬프트는 500자 이하로 입력해주세요. (현재 501자)');
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    const result = validatePrompt(`  ${'가'.repeat(MAX_PROMPT_LENGTH)}\n `);
    expect(result.length).toBe(MAX_PROMPT_LENGTH);
    expect(result.isValid).toBe(true);
  });

  it('비어 있거나 공백뿐이면 무효지만 에러 메시지는 없다', () => {
    const result = validatePrompt('   \n');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeNull();
  });

  it('이모지처럼 서로게이트 쌍인 문자도 1자로 센다', () => {
    const result = validatePrompt('🚀'.repeat(MAX_PROMPT_LENGTH));
    expect(result.length).toBe(MAX_PROMPT_LENGTH);
    expect(result.isValid).toBe(true);
  });
});
