import { useState } from 'react';
import type { GeneratedComponent } from '../types';
import { LivePreview } from './LivePreview';
import { CodeView } from './CodeView';
import { toStreamingDisplay } from '../utils/streamingCode';

interface ComponentCardProps {
  component: GeneratedComponent;
  onRemove: (id: string) => void;
  onRegenerate: (prompt: string) => void;
  isLoading: boolean;
}

type Tab = 'preview' | 'code';

const TABS: { id: Tab; label: string }[] = [
  { id: 'preview', label: '미리보기' },
  { id: 'code', label: '코드' },
];

export function ComponentCard({ component, onRemove, onRegenerate, isLoading }: ComponentCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>(component.isStreaming ? 'code' : 'preview');
  const [wasStreaming, setWasStreaming] = useState(component.isStreaming);

  // 스트리밍이 끝나는 순간 완성된 컴포넌트를 바로 보여주도록 미리보기 탭으로 넘긴다.
  // effect 대신 렌더 중에 이전 값과 비교해 갱신한다(React 권장 패턴, 추가 렌더 없이 반영).
  if (wasStreaming !== component.isStreaming) {
    setWasStreaming(component.isStreaming);
    if (wasStreaming && !component.isStreaming) setActiveTab('preview');
  }
  const [previewKey, setPreviewKey] = useState(0);
  const createdAt = component.createdAt.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const panelId = `panel-${component.id}`;

  return (
    <article className="window window--component">
      <div className="titlebar">
        <button
          className="close-box"
          onClick={() => onRemove(component.id)}
          title="창 닫기 (삭제)"
          aria-label="이 컴포넌트 삭제"
        />
        <h3 className="titlebar-text" title={component.prompt}>
          {component.prompt}
        </h3>
        <time className="titlebar-time">{createdAt}</time>
      </div>

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={panelId}
              className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.id === 'preview' && component.isStreaming}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          {activeTab === 'preview' && (
            <button className="btn" onClick={() => setPreviewKey((k) => k + 1)}>
              다시 재생
            </button>
          )}
          <button
            className="btn"
            onClick={() => onRegenerate(component.prompt)}
            disabled={isLoading}
          >
            {isLoading ? '생성 중...' : '다시 생성'}
          </button>
        </div>
      </div>

      <div className="window-content" id={panelId} role="tabpanel">
        {activeTab === 'preview' ? (
          <LivePreview key={previewKey} code={component.code} />
        ) : (
          <CodeView
            code={component.isStreaming ? toStreamingDisplay(component.code) : component.code}
          />
        )}
      </div>
    </article>
  );
}
