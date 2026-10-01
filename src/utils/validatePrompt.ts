export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  length: number;
  isValid: boolean;
  error: string | null;
}

/**
 * 전송될 값(앞뒤 공백 제거)을 기준으로 프롬프트 길이를 검증한다.
 * 이모지 등이 2자로 세지지 않도록 UTF-16 코드 유닛이 아닌 코드 포인트로 센다.
 */
export function validatePrompt(prompt: string): PromptValidation {
  const length = Array.from(prompt.trim()).length;
  if (length > MAX_PROMPT_LENGTH) {
    return {
      length,
      isValid: false,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자 이하로 입력해주세요. (현재 ${length}자)`,
    };
  }
  return { length, isValid: length > 0, error: null };
}
