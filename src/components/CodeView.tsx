import { useState } from 'react';

interface CodeViewProps {
  code: string;
}

export function CodeView({ code }: CodeViewProps) {
  const [copied, setCopied] = useState(false);
  const lineCount = code.split('\n').length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-panel">
      <div className="code-bar">
        <span>JSX, {lineCount}줄</span>
        <button className="btn" onClick={handleCopy}>
          {copied ? '복사됨' : '코드 복사'}
        </button>
      </div>
      <pre className="code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}
