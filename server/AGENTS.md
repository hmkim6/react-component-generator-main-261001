# server/AGENTS.md

## Module Context

Bun 런타임에서 도는 AI API 프록시. 클라이언트 요청을 받아 Anthropic/Gemini를 호출하고, 응답을 react-live 실행용 코드로 정규화해 `{ code }`로 돌려준다.

## Tech Stack & Constraints

- 런타임은 Bun(`Bun.serve`). Express 등 서버 프레임워크나 AI SDK 패키지를 추가하지 않는다. 외부 API는 전역 `fetch`로 직접 호출한다 (`index.ts:69`, `index.ts:101`).
- 이 디렉토리는 어떤 tsconfig에도 포함되지 않아 `bun run build`가 타입체크하지 않는다. 검증은 `bun run test`와 `bun run lint`로 한다.
- 개발 중에는 `bun --watch`로 실행되므로(`package.json` `server` 스크립트) 재시작이 필요 없다. `.env`는 Bun이 자동 로드한다.

## Implementation Patterns

- 부수효과가 있는 코드(`Bun.serve`, 외부 fetch)는 `index.ts`에만 둔다. 문자열 정규화, 재시도/폴백 같은 로직은 `generator.ts`, `fallback.ts`처럼 순수 함수 모듈로 분리하고 같은 이름의 `*.test.ts`를 둔다.
- 모든 응답(에러, 404, OPTIONS 포함)에 `CORS_HEADERS`를 붙인다 (`index.ts:51-55`, 모든 `Response.json` 호출).
- 에러 응답 형식은 `{ error: string }`. 클라이언트가 `data.error`를 그대로 사용자에게 보여준다 (`src/hooks/useComponentGenerator.ts:32`).

## Testing Strategy

- `bun run test server/` — Vitest. `vi.fn`으로 `attempt` 콜백을 주입해 네트워크 없이 테스트한다 (`fallback.test.ts`).
- `index.ts`를 테스트에서 import하지 마라. import 시점에 `Bun.serve`가 포트 3002를 점유한다 (`index.ts:138`).

## Local Golden Rules

- Hard Constraint: 프로바이더 호출 함수가 던지는 에러 메시지에는 HTTP 상태 코드 숫자를 포함해야 한다 (`index.ts:85`, `index.ts:112`). 상위 핸들러가 `message.includes('503')`/`includes('429')`로 상태를 분류한다 (`index.ts:194-206`). 메시지 형식을 바꾸면 과부하·레이트리밋 안내가 500으로 떨어진다.
- Asymmetry: Gemini 경로에만 모델 폴백(`GOOGLE_MODELS`, `index.ts:4`, `index.ts:134-136`)과 `MAX_TOKENS` 잘림 감지(`index.ts:122-125`)가 있다. Anthropic 경로(`index.ts:68-96`)는 단일 모델이고 `stop_reason: "max_tokens"`를 검사하지 않는다. 한쪽 경로를 고칠 때 다른 쪽에도 같은 처리가 필요한지 판단하고, 의도적으로 다르게 둔다면 사유를 주석으로 남긴다.
- Do: `GOOGLE_MODELS`는 우선순위 순서다. 앞 모델이 실패해야 다음 모델을 시도한다 (`index.ts:3-4`). 순서를 바꾸면 비용과 품질이 바뀐다.
- Do: 모델 ID를 바꿀 때는 Anthropic(`index.ts:77`)과 Gemini(`index.ts:4`)를 각각 확인한다. 상수로 분리돼 있지 않다.
- Security Boundary: 클라이언트 키가 오면 서버 `.env` 키보다 우선한다 (`index.ts:64-66`). 키 값을 로그·에러 응답에 넣지 마라. Gemini 키는 URL 쿼리에 들어가므로(`index.ts:99`) 요청 URL을 로그로 남기지 마라.
- Double Defense: `stripCodeFences` → `ensureRenderCall` 순서로 적용한다 (`index.ts:188`). 펜스를 먼저 제거해야 render 감지 정규식이 정확하다. SYSTEM_PROMPT의 같은 규칙과 함께 둘 다 유지한다.
