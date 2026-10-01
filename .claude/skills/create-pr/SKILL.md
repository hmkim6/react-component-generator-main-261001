---
name: create-pr
description: |
  현재 브랜치의 커밋으로 GitHub Pull Request를 만든다. 대상 저장소가 해외·오픈소스면 영문 템플릿, 한국 프로젝트면 한국어 템플릿을 자동으로 골라 제목과 본문을 채우고, 브랜치 push부터 gh pr create까지 서브에이전트에서 끝낸다.
  "PR 만들어줘", "PR 올려줘", "풀리퀘 생성", "이거 PR로 보내줘", "open a PR", "create pull request", "/create-pr" 같은 요청에 활성화한다.
  커밋(commit), 리뷰 코멘트 반영(autofix), 코드 리뷰(code-review)에는 쓰지 않는다.
argument-hint: "[en|ko] [draft] [base:<브랜치>] [dry-run]"
context: fork
---

# create-pr: 언어를 판정해 GitHub PR 생성

이 스킬은 포크된 서브에이전트에서 실행된다. 메인 대화의 맥락은 보이지 않으므로 **모든 판단은 git·gh 기록에서 직접 끌어낸다.** 사용자에게 되물을 수 없으니, 애매한 결정은 아래 규칙대로 내리고 최종 보고에 근거를 남긴다. 사용자가 `/create-pr`을 호출한 것 자체가 push와 PR 생성에 대한 승인이다.

인자: `$ARGUMENTS`

- `en` / `ko`: 템플릿 언어 강제 (자동 판정보다 우선)
- `draft`: Draft PR로 생성
- `base:<브랜치>`: base 브랜치 지정 (기본: 대상 저장소의 기본 브랜치)
- `dry-run`: push와 PR 생성 없이 제목·본문·실행할 명령만 보고. 확인용.

## Step 1: 사전 점검

다음 중 하나라도 걸리면 **아무것도 push하지 말고** 이유와 해결 방법을 보고하고 끝낸다.

```bash
git rev-parse --is-inside-work-tree
gh auth status
git status --short
git remote -v
```

- git 저장소가 아니거나 `gh` 미인증이면 중단. 미인증이면 `! gh auth login`을 안내한다.
- GitHub 리모트가 없으면 중단. 저장소 생성은 이 스킬의 일이 아니다.
- 커밋되지 않은 변경은 PR에 들어가지 않는다. 중단하지는 않되 최종 보고에 파일 목록과 함께 "`/commit`으로 먼저 커밋할지 확인하세요"를 남긴다. 이 스킬에서 대신 커밋하지 않는다 — 무엇을 어떤 단위로 커밋할지는 사용자 결정이다.

## Step 2: 대상 저장소와 브랜치 결정

**대상 저장소(base repo):** `upstream` 리모트가 있으면 그쪽(포크에서 원본 프로젝트로 기여하는 경우), 없으면 `origin`.

```bash
gh repo view <OWNER/NAME> --json nameWithOwner,defaultBranchRef,isFork,parent
```

`origin`이 포크(`isFork: true`)인데 `upstream` 리모트가 없으면 `parent`를 대상 저장소로 쓴다.

**base 브랜치:** `base:` 인자 > 대상 저장소 기본 브랜치.

**head 브랜치:**

```bash
git fetch <base 리모트> <base 브랜치>
git log --oneline <base 리모트>/<base 브랜치>..HEAD
```

- base 대비 새 커밋이 없으면 "PR로 보낼 커밋이 없습니다"라고 보고하고 끝낸다.
- 현재 브랜치가 base 브랜치와 같은 이름이면(예: `main`에서 직접 커밋한 경우) 현재 HEAD에서 새 브랜치를 만든다. 이름은 커밋 내용으로 짓는다: `<type>/<영문-kebab-요약>` (예: `feat/prompt-length-limit`). 같은 이름이 이미 있으면 `-2`를 붙인다. 로컬 `main`은 되돌리지 않는다 — 리셋은 파괴적이고, 머지 후 정리는 사용자 몫이다. 보고에 "로컬 main이 origin보다 N커밋 앞서 있음"을 남긴다.
- 이미 이 head 브랜치로 열린 PR이 있으면(`gh pr list --head <브랜치> --state open`) 새로 만들지 말고, 새 커밋만 push한 뒤 기존 PR URL을 보고한다.

## Step 3: 템플릿 언어 결정

우선순위대로 첫 번째로 결정되는 것을 쓴다.

1. **인자 `en` / `ko`.**
2. **저장소 자체 PR 템플릿.** `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/*.md`, `docs/pull_request_template.md`, 루트 `pull_request_template.md` 중 하나가 있으면 **그 구조와 언어를 그대로 따르고** 이 스킬의 템플릿은 쓰지 않는다. 메인테이너가 정한 형식이 우리 형식보다 우선이다. 체크리스트 항목은 실제로 해당하는 것만 체크한다.
3. **자동 판정.** 이 스킬의 base directory에서 스크립트를 실행한다:

   ```bash
   python3 <base directory>/scripts/detect_language.py --repo <대상 저장소>
   ```

   대상 저장소의 최근 PR(가중치 3), 커밋 제목(2), README(1)에 한글이 섞인 비율로 `en`/`ko`를 낸다. 해외 오픈소스는 PR·README가 영어라 `en`, 한국 팀 프로젝트는 커밋·PR이 한국어라 `ko`가 나온다. 스크립트 결과의 `reason`을 최종 보고에 그대로 옮긴다.

결정되면 해당 템플릿만 읽는다:

- `en` → `references/template-en.md`
- `ko` → `references/template-ko.md`

언어를 섞지 않는다. 영문 PR에 한국어 커밋 메시지를 그대로 붙이지 말고 번역·요약한다.

## Step 4: 내용 수집

```bash
git log --format='%h %s%n%b' <base>..HEAD
git diff --stat <base>...HEAD
git diff <base>...HEAD
```

- diff가 크면 `--stat`으로 범위를 잡고, 동작이 바뀐 파일만 골라 읽는다.
- 저장소 루트의 `AGENTS.md` / `CLAUDE.md` / `CONTRIBUTING.md`에 PR 규칙(제목 형식, 필수 체크, 이슈 연결)이 있으면 따른다.
- **테스트 섹션:** 같은 문서나 `package.json`에 정의된 테스트·린트 명령이 있으면 한 번 실행하고 실제 결과를 적는다. 실패하면 PR은 그대로 만들되 본문과 보고에 실패를 숨기지 않고 적는다 — 리뷰어가 먼저 알아야 하는 정보다. 실행할 명령을 찾지 못했으면 실행하지 않았다고 적는다.
- 이슈 번호는 브랜치 이름(`feat/123-...`), 커밋 메시지(`#123`)에서 확인된 것만 쓴다.

## Step 5: 제목·본문 작성

템플릿의 제목 규칙과 본문 구조를 따른다.

- 본문은 리뷰어가 diff를 열기 전에 "무엇을, 왜, 어떻게 확인했는지"를 알게 하는 것이 목적이다. 커밋 목록을 그대로 나열하지 말고 동작 단위로 묶는다.
- 해당 없는 섹션은 지운다. 빈 섹션은 리뷰어 시간을 뺏는다.
- 환경이 PR 본문 attribution 줄(예: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`)을 지정했다면 본문 맨 끝에 붙인다.

본문은 임시 파일에 써서 넘긴다. 따옴표·백틱이 셸에서 깨지지 않게 하기 위해서다.

## Step 6: push와 PR 생성

`dry-run`이면 여기서 멈추고, 아래 명령과 제목·본문 전문을 보고한다.

```bash
git push -u origin <head 브랜치>
gh pr create --repo <대상 저장소> --base <base 브랜치> \
  --head <head 지정> --title "<제목>" --body-file <본문 파일> [--draft]
```

- `--head`: 대상 저장소가 `origin`과 같으면 `<브랜치>`, 포크에서 upstream으로 보내면 `<origin 소유자>:<브랜치>`.
- `--force` push는 하지 않는다. push가 거절되면(non-fast-forward 등) 중단하고 원인을 보고한다.
- 생성 후 `gh pr view <URL> --json url,title,baseRefName,headRefName,isDraft`로 결과를 확인한다.

## Step 7: 보고

메인 대화로 돌아갈 결과는 짧고 검증 가능해야 한다. 이 형식을 쓴다:

```
PR: <URL> (draft 여부)
대상: <대상 저장소> <base> ← <head>
언어: <en|ko> — <결정 근거: 인자 / 저장소 템플릿 경로 / 스크립트 reason>
제목: <제목>
테스트: <실행한 명령과 결과, 또는 실행 안 함>
주의: <새로 만든 브랜치, 로컬 main이 앞서 있음, 커밋 안 된 변경, 테스트 실패 등. 없으면 생략>
```

`dry-run`이면 PR 줄 대신 `DRY RUN — 생성하지 않음`과 본문 전문을 넣는다.
