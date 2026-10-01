import { useState } from 'react';
import { validatePrompt, MAX_PROMPT_LENGTH } from '../utils/validatePrompt';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  history?: string[];
  onRemoveHistory?: (prompt: string) => void;
  onClearHistory?: () => void;
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({
  onGenerate,
  isLoading,
  history = [],
  onRemoveHistory,
  onClearHistory,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const validation = validatePrompt(prompt);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.isValid && !isLoading) {
      onGenerate(prompt.trim());
    }
  };

  return (
    <div className="prompt-section">
      <h1 className="prompt-title">
        <label htmlFor="prompt">무엇을 만들까요?</label>
      </h1>
      <form onSubmit={handleSubmit} className="prompt-form">
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 고객 목록 테이블 위에 들어갈 검색 필터 바. 상태, 담당자, 날짜 범위 필터가 필요해."
          className="prompt-textarea"
          rows={4}
          aria-invalid={validation.error ? true : undefined}
          aria-describedby={validation.error ? 'prompt-error' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        {validation.error && (
          <p id="prompt-error" className="prompt-error" role="alert">
            {validation.error}
          </p>
        )}
        <div className="prompt-actions">
          <span className="prompt-shortcut">
            <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd>로 바로 생성
          </span>
          <span className="prompt-count">
            {validation.length} / {MAX_PROMPT_LENGTH}
          </span>
          <button
            type="submit"
            className="btn btn--default"
            disabled={!validation.isValid || isLoading}
          >
            {isLoading ? '생성 중...' : '컴포넌트 생성'}
          </button>
        </div>
      </form>
      <div className="prompt-side">
        {history.length > 0 && (
          <div className="examples">
            <div className="history-header">
              <p className="examples-label" id="history-label">
                최근 프롬프트
              </p>
              <button
                type="button"
                className="btn"
                aria-label="최근 프롬프트 모두 지우기"
                onClick={onClearHistory}
              >
                모두 지우기
              </button>
            </div>
            <ul className="examples-list" aria-labelledby="history-label">
              {history.map((item) => (
                <li key={item} className="history-item">
                  <button
                    type="button"
                    className={`example-row ${prompt === item ? 'example-row--selected' : ''}`}
                    onClick={() => setPrompt(item)}
                  >
                    {item}
                  </button>
                  <button
                    type="button"
                    className="history-remove"
                    aria-label={`"${item}" 기록 삭제`}
                    title="기록 삭제"
                    onClick={() => onRemoveHistory?.(item)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="examples">
          <p className="examples-label" id="examples-label">
            예시를 고르면 입력란에 채워집니다
          </p>
          <ul className="examples-list" aria-labelledby="examples-label">
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button
                  type="button"
                  className={`example-row ${prompt === example ? 'example-row--selected' : ''}`}
                  onClick={() => setPrompt(example)}
                >
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
