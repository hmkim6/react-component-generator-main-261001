import { stripCodeFences, ensureRenderCall } from './generator';
import { withModelFallback } from './fallback';
import {
  TRUNCATED_MESSAGE,
  anthropicDeltaText,
  geminiDeltaText,
  relayTextStream,
  toNDJSONStream,
} from './stream';

// 우선순위 순서. 앞 모델이 실패하면 다음 모델로 폴백한다.
const GOOGLE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

const SYSTEM_PROMPT = `You are a React component generator. Generate a single React component based on the user's description.

Rules:
- Use inline styles only (no CSS imports, no CSS modules)
- Do NOT use import statements — React is already available in scope as a global
- Define the component as a function, then call render(<ComponentName />) at the end
- Make the component visually appealing with proper styling
- Use React hooks if needed (e.g., React.useState, React.useEffect)
- The component must be completely self-contained
- Respond with ONLY the code block — no explanations, no markdown fences
- Use descriptive variable names and clean formatting
- For colors, prefer modern palettes (gradients, shadows, etc.)
- Ensure the component is interactive where appropriate (hover states, click handlers, etc.)
- Do NOT use TypeScript syntax — no type annotations, no interfaces, no generics, no "as" casts. Write plain JavaScript only.

Example output format:
const GradientButton = () => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        background: hovered
          ? 'linear-gradient(135deg, #667eea, #764ba2)'
          : 'linear-gradient(135deg, #764ba2, #667eea)',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Click me
    </button>
  );
};

render(<GradientButton />);`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

type Provider = 'anthropic' | 'google';

const ENV_KEYS: Record<Provider, string | undefined> = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

function resolveApiKey(provider: Provider, clientKey?: string): string | null {
  return clientKey || ENV_KEYS[provider] || null;
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function callGoogleModel(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{
      content: { parts: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error(TRUNCATED_MESSAGE);
  }

  return (
    candidate?.content?.parts
      ?.map((part) => part.text)
      ?.join('') ?? ''
  );
}

async function callGoogle(prompt: string, apiKey: string): Promise<string> {
  return withModelFallback(GOOGLE_MODELS, (model) => callGoogleModel(prompt, apiKey, model));
}

// 스트리밍: 업스트림 응답이 200으로 열린 뒤의 본문(SSE)을 돌려준다.
// 열기 실패는 상태 코드를 담아 던져서, 응답을 보내기 전에 503/429 분류가 동작하게 한다.
async function openAnthropicStream(prompt: string, apiKey: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Claude API error: ${response.status}`);
  }
  return response.body;
}

// 폴백은 스트림을 여는 단계에서만 일어난다. 일단 조각을 보내기 시작하면 다른 모델로 바꾸지 않는다.
async function openGoogleStream(prompt: string, apiKey: string): Promise<ReadableStream<Uint8Array>> {
  return withModelFallback(GOOGLE_MODELS, async (model) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    return response.body;
  });
}

function errorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('503')) {
    return Response.json(
      { error: 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.' },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  if (message.includes('429')) {
    return Response.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  return Response.json(
    { error: message },
    { status: 500, headers: CORS_HEADERS }
  );
}

type GenerateRequest = { prompt: string; apiKey: string; provider: Provider };

// 요청 본문을 검증한다. 문제가 있으면 바로 돌려줄 400 응답을, 없으면 정리된 요청을 반환한다.
async function parseGenerateRequest(req: Request): Promise<GenerateRequest | Response> {
  const { prompt, apiKey, provider = 'anthropic' } = (await req.json()) as {
    prompt: string;
    apiKey?: string;
    provider?: Provider;
  };

  const resolvedKey = resolveApiKey(provider, apiKey);

  if (!resolvedKey) {
    return Response.json(
      { error: `API key is required. Set ${provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GOOGLE_API_KEY'} in .env or enter it manually.` },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!prompt) {
    return Response.json(
      { error: 'Prompt is required' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  return { prompt, apiKey: resolvedKey, provider };
}

const server = Bun.serve({
  port: 3002,
  async fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);

    if (req.method === 'GET' && url.pathname === '/api/config') {
      return Response.json(
        {
          envKeys: {
            anthropic: !!ENV_KEYS.anthropic,
            google: !!ENV_KEYS.google,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    if (req.method === 'POST' && url.pathname === '/api/generate') {
      try {
        const parsed = await parseGenerateRequest(req);
        if (parsed instanceof Response) return parsed;
        const { prompt, apiKey, provider } = parsed;

        const text =
          provider === 'google'
            ? await callGoogle(prompt, apiKey)
            : await callAnthropic(prompt, apiKey);

        const code = ensureRenderCall(stripCodeFences(text));

        return Response.json({ code }, { headers: CORS_HEADERS });
      } catch (err) {
        return errorResponse(err);
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/generate/stream') {
      try {
        const parsed = await parseGenerateRequest(req);
        if (parsed instanceof Response) return parsed;
        const { prompt, apiKey, provider } = parsed;

        const deltas =
          provider === 'google'
            ? relayTextStream(await openGoogleStream(prompt, apiKey), geminiDeltaText)
            : relayTextStream(await openAnthropicStream(prompt, apiKey), anthropicDeltaText);

        // 완성본은 비스트리밍 경로와 같은 순서로 정규화한다 (stripCodeFences → ensureRenderCall).
        const body = toNDJSONStream(deltas, (fullText) => ensureRenderCall(stripCodeFences(fullText)));

        return new Response(body, {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (err) {
        return errorResponse(err);
      }
    }

    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  },
});

console.log(`API server running at http://localhost:${server.port}`);
