import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { loadJSON, saveJSON } from './utils/storage';
import { STORAGE_KEYS } from './utils/persisted';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/api/config'
        ? Response.json({ envKeys: { anthropic: true, google: true } })
        : Response.json({ code: 'const Card = () => <div>카드</div>;\nrender(<Card />);' }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App 상태 유지', () => {
  it('localStorage에 저장된 Provider로 시작한다', () => {
    saveJSON(STORAGE_KEYS.provider, 'anthropic');

    render(<App />);

    expect(screen.getByRole('radio', { name: 'Anthropic' })).toBeChecked();
  });

  it('Provider를 바꾸면 localStorage에 저장한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'Anthropic' }));

    expect(loadJSON(STORAGE_KEYS.provider, null)).toBe('anthropic');
  });

  it('생성한 프롬프트와 컴포넌트가 새로고침 후에도 남아 있다', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.type(screen.getByRole('textbox', { name: '무엇을 만들까요?' }), '프로필 카드');
    await user.click(screen.getByRole('button', { name: '컴포넌트 생성' }));
    await screen.findByRole('heading', { name: '프로필 카드' });
    unmount();

    render(<App />);

    const recent = screen.getByRole('list', { name: '최근 프롬프트' });
    expect(within(recent).getByRole('button', { name: '프로필 카드' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '프로필 카드' })).toBeInTheDocument();
  });
});
