import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>('google');
  const [keyNotice, setKeyNotice] = useState<string | null>(null);
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];
  const hasKey = hasEnvKey || apiKey.trim().length > 0;
  const activeProvider = PROVIDER_CONFIG[provider].label;

  const handleGenerate = (prompt: string) => {
    if (!hasKey) {
      setKeyNotice(`${activeProvider} API 키가 없습니다. 오른쪽 실행 설정에 키를 입력하세요.`);
      document.getElementById('api-key')?.focus();
      return;
    }
    setKeyNotice(null);
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  const alertMessage = keyNotice ?? error;

  return (
    <div className="desktop">
      <header className="menubar">
        <div className="menubar-brand">
          <img src="/favicon.svg" alt="" width="16" height="16" />
          <span>컴포넌트 생성기</span>
        </div>
        <dl className="menubar-status" aria-label="현재 작업 상태">
          <div>
            <dt>모델</dt>
            <dd>{activeProvider}</dd>
          </div>
          <div>
            <dt>API 키</dt>
            <dd>
              <span className={`led ${hasKey ? 'led--on' : ''}`} aria-hidden="true" />
              {hasKey ? '연결됨' : '필요'}
            </dd>
          </div>
          <div>
            <dt>만든 컴포넌트</dt>
            <dd>{components.length}개</dd>
          </div>
        </dl>
      </header>

      <main className="workspace">
        <div className="workspace-top">
          <section className="window window--composer" aria-labelledby="composer-title">
            <div className="titlebar">
              <span className="titlebar-text" id="composer-title">새 컴포넌트</span>
            </div>
            <div className="window-body">
              <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
            </div>
          </section>

          <aside className="window window--settings" aria-labelledby="settings-title">
            <div className="titlebar">
              <span className="titlebar-text" id="settings-title">실행 설정</span>
            </div>
            <div className="window-body settings-body">
              <fieldset className="field">
                <legend className="field-label">AI 모델 제공사</legend>
                <div className="radio-group">
                  {(Object.keys(PROVIDER_CONFIG) as Provider[]).map((key) => (
                    <label key={key} className="radio">
                      <input
                        type="radio"
                        name="provider"
                        value={key}
                        checked={provider === key}
                        onChange={() => handleProviderChange(key)}
                      />
                      <span>{PROVIDER_CONFIG[key].label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <label className="field-label" htmlFor="api-key">
                  API 키
                </label>
                <div className="api-key-field">
                  <input
                    id="api-key"
                    className="text-field"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (keyNotice) setKeyNotice(null);
                    }}
                    placeholder={
                      hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="btn" onClick={() => setShowKey(!showKey)} type="button">
                    {showKey ? '숨기기' : '보기'}
                  </button>
                </div>
                <p className="field-hint">
                  {hasEnvKey
                    ? '.env에 등록된 키로 생성합니다. 여기에 입력하면 이 키가 우선합니다.'
                    : '키를 입력하거나 서버 .env에 등록하세요. 키는 브라우저에 저장되지 않습니다.'}
                </p>
              </div>
            </div>
          </aside>
        </div>

        {alertMessage && (
          <div className="alert" role="alert">
            <span className="alert-icon" aria-hidden="true">!</span>
            <p>{alertMessage}</p>
          </div>
        )}

        {isLoading && (
          <div className="window window--progress" role="status">
            <div className="titlebar">
              <span className="titlebar-text">생성 중</span>
            </div>
            <div className="window-body progress-body">
              <p>{activeProvider}가 코드를 작성하고 있습니다. 아래 창의 코드 탭에서 실시간으로 보이고, 완성되면 미리보기로 넘어갑니다.</p>
              <div className="progress-bar" aria-hidden="true" />
            </div>
          </div>
        )}

        <section className="results" aria-labelledby="results-title">
          {components.length > 0 && (
            <div className="results-header">
              <h2 id="results-title">
                만든 컴포넌트 <span className="results-count">{components.length}</span>
              </h2>
              <button className="btn" onClick={clearAll}>
                모두 닫기
              </button>
            </div>
          )}

          {components.length === 0 && !isLoading && (
            <div className="empty-marquee">
              <h2 id="results-title">아직 열린 창이 없습니다</h2>
              <p>
                위에서 만들 컴포넌트를 설명하고 생성을 누르면, 미리보기와 코드가 담긴 창이 여기에
                열립니다.
              </p>
            </div>
          )}

          <div className="results-stack">
            {components.map((component) => (
              <ComponentCard
                key={component.id}
                component={component}
                onRemove={removeComponent}
                onRegenerate={handleGenerate}
                isLoading={isLoading}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
