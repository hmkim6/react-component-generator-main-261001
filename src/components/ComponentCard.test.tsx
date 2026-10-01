import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentCard } from './ComponentCard';
import type { GeneratedComponent } from '../types';

const base: GeneratedComponent = {
  id: '1',
  prompt: '프로필 카드',
  code: '',
  createdAt: new Date('2026-10-01T09:30:00Z'),
};

function renderCard(component: GeneratedComponent) {
  return render(
    <ComponentCard component={component} onRemove={vi.fn()} onRegenerate={vi.fn()} isLoading={false} />,
  );
}

describe('ComponentCard 스트리밍', () => {
  it('스트리밍 중이면 코드 탭을 선택하고 지금까지 받은 코드를 펜스 없이 보여준다', () => {
    renderCard({ ...base, code: '```jsx\nconst Card = () => (', isStreaming: true });

    expect(screen.getByRole('tab', { name: '코드' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('const Card = () => (')).toBeInTheDocument();
  });

  it('스트리밍이 끝나면 미리보기 탭으로 전환한다', () => {
    const { rerender } = renderCard({ ...base, code: 'const A = () => <p>A</p>;', isStreaming: true });

    rerender(
      <ComponentCard
        component={{ ...base, code: 'const A = () => <p>A</p>;\n\nrender(<A />);', isStreaming: false }}
        onRemove={vi.fn()}
        onRegenerate={vi.fn()}
        isLoading={false}
      />,
    );

    expect(screen.getByRole('tab', { name: '미리보기' })).toHaveAttribute('aria-selected', 'true');
  });

  it('스트리밍 중에는 미완성 코드가 실행되지 않도록 미리보기 탭을 비활성화한다', () => {
    renderCard({ ...base, code: 'const Card = (', isStreaming: true });

    expect(screen.getByRole('tab', { name: '미리보기' })).toBeDisabled();
  });
});
