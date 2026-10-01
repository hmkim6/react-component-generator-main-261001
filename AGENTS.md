# AGENTS.md

프로젝트 소개, 설치, 실행 방법은 `README.md`를 따른다. 이 문서는 에이전트 전용 지침만 담는다.

## Operational Commands

- 패키지 매니저와 런타임은 `bun` 고정. npm/yarn/pnpm 사용 금지 (`bun.lock`만 존재).
- 개발 서버: `bun run dev` (API 서버 :3002 + Vite :5173 동시 실행)
- API 서버만: `bun run server`
- 테스트: `bun run test` (Vitest). `bun test`(Bun 내장 러너)를 쓰지 말 것 — jsdom 환경과 `src/test/setup.ts`가 적용되지 않는다 (`vite.config.ts:16-21`).
- 단일 테스트: `bun run test server/generator.test.ts`
- 린트: `bun run lint`
- 빌드/타입체크: `bun run build`
- 변경 후 완료 보고 전에 `bun run test`와 `bun run lint`를 실행한다.

## Golden Rules

### Immutable

- API 키는 서버(`process.env`)에서만 읽는다. `VITE_` 접두사 환경변수나 클라이언트 번들에 키를 넣지 않는다. `/api/config`는 키 존재 여부(boolean)만 반환한다 (`server/index.ts:59-62`, `server/index.ts:147-156`).
- 사용자가 UI에 입력한 키는 메모리 state에만 둔다. localStorage/sessionStorage/쿠키에 저장하지 않는다. UI가 "키는 브라우저에 저장되지 않습니다"라고 사용자에게 약속한다 (`src/App.tsx:140`).
- `.env`는 커밋하지 않는다 (`.gitignore`). 워크트리에는 `.worktreeinclude`로 복사된다.

### Do's & Don'ts

- Do: 생성 코드가 미리보기에 렌더되려면 `render(<Component />)` 호출이 반드시 있어야 한다. react-live를 `noInline` 모드로 쓰기 때문이다 (`src/components/LivePreview.tsx:10`, `server/generator.ts:12-17`).
- Don't: 생성 코드 실행 경로에 TypeScript 문법이나 `import`가 들어가게 만들지 마라. react-live는 JS로 실행하며 React는 전역 스코프로 주입된다. SYSTEM_PROMPT가 이를 금지한다 (`server/index.ts:11`, `server/index.ts:20`).
- Do (Double Defense): "코드펜스 없이" / "render 호출 포함" 규칙은 SYSTEM_PROMPT(`server/index.ts:12`, `server/index.ts:16`)와 서버 후처리 `stripCodeFences`·`ensureRenderCall`(`server/index.ts:188`) 두 곳에서 막는다. 어느 한쪽만 남기고 제거하지 마라 — 모델은 프롬프트를 자주 어긴다.
- Do: `Provider` 타입은 클라이언트(`src/types/index.ts:1`)와 서버(`server/index.ts:57`)에 각각 정의돼 있다. 프로바이더를 추가·변경하면 두 곳과 `PROVIDER_CONFIG`(`src/App.tsx:8-11`), `ENV_KEYS`(`server/index.ts:59-62`)를 함께 수정한다.
- Do: API 포트 3002는 `server/index.ts:139`와 Vite 프록시 `vite.config.ts:11` 두 곳에 하드코딩돼 있다. 바꿀 때는 둘 다 바꾼다.
- Don't: 클라이언트에서 외부 AI API를 직접 호출하지 마라. 모든 호출은 `/api/*` 프록시를 거친다 (`src/hooks/useComponentGenerator.ts:23`).
- Don't: `server/`의 타입 오류는 `bun run build`가 잡지 않는다. `tsconfig.app.json`은 `src`만, `tsconfig.node.json`은 `vite.config.ts`만 포함한다. 서버 수정 후에는 테스트와 린트로 검증한다.
- Don't: TS `enum`, `namespace`, 파라미터 프로퍼티를 쓰지 마라. `erasableSyntaxOnly`가 켜져 있다 (`tsconfig.app.json:23`). 유니언 리터럴 타입을 쓴다.

### Test Boundary

- 테스트가 있는 곳: 서버 순수 함수(`server/generator.ts`, `server/fallback.ts`)와 `src/components/PromptInput.tsx`.
- 테스트가 없는 곳: `server/index.ts`(Bun.serve 부수효과), `useComponentGenerator`, `App.tsx`.
- 새 로직은 부수효과 없는 순수 함수로 분리해 테스트 가능한 모듈에 둔다 (`server/generator.ts:1-2` 주석이 이 원칙을 명시).

## Project Context

- 자연어 프롬프트로 React 컴포넌트를 AI 생성하고 실시간 미리보기·코드를 보여주는 도구.
- Stack: React 19, TypeScript 5.9, Vite 8, Bun, react-live 4, Vitest 4, Testing Library, Anthropic Messages API, Google Gemini API.

## Standards & References

- UI는 Platinum 시대 데스크톱 테마다. 새 UI는 `src/index.css`의 CSS 토큰(`--plastic`, `--select` 등, `src/index.css:13-29`)과 `src/App.css`의 `.window`, `.titlebar`, `.btn` 클래스를 재사용하고, 새 색상·폰트를 임의로 도입하지 않는다.
- UI 문구와 서버 에러 메시지, 테스트 설명(`it(...)`)은 한국어로 작성한다.
- 커밋 메시지: `<type>: <한국어 요약>` (type: feat, fix, refactor, chore). 상세 절차는 `.claude/skills/commit/SKILL.md`.
- 스킬 파일은 `.claude/skills/`와 `.agents/skills/`(Codex용) 양쪽에 있고 `skills-lock.json`으로 관리된다. 직접 수정보다 업스트림 갱신을 우선한다.

## Maintenance Policy

- 이 문서의 규칙과 실제 코드가 어긋나면(라인 번호 이동 포함) 작업 중 발견한 즉시 문서 업데이트를 제안한다.
- 서버 전용 규칙은 `server/AGENTS.md`에 있다.
