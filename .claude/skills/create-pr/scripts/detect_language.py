#!/usr/bin/env python3
"""PR 템플릿 언어(en/ko)를 저장소의 실제 기록으로 판정한다.

신호와 가중치 (target 저장소 = upstream 리모트가 있으면 upstream, 없으면 origin):
  - 최근 PR 제목·본문 (가중치 3): 리뷰어가 실제로 쓰는 언어라 가장 강한 신호
  - 최근 커밋 제목    (가중치 2)
  - README 산문 줄    (가중치 1)
각 신호는 "한글이 들어간 항목의 비율"(0~1)이고, 가중 평균이 0.4 이상이면 ko.
샘플이 없는 신호는 계산에서 빠진다. 신호가 하나도 없으면 en.

사용: python3 detect_language.py [--repo OWNER/NAME]
출력: JSON {"lang", "score", "target_repo", "signals", "reason"}
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

HANGUL = re.compile(r"[가-힣]")
THRESHOLD = 0.4
WEIGHTS = {"pr_history": 3, "commits": 2, "readme": 1}


def run(cmd: list[str]) -> str | None:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return out.stdout if out.returncode == 0 else None


def repo_from_url(url: str) -> str | None:
    m = re.search(r"github\.com[:/]([^/]+)/([^/\s]+?)(?:\.git)?/?$", url.strip())
    return f"{m.group(1)}/{m.group(2)}" if m else None


def target_repo() -> str | None:
    for remote in ("upstream", "origin"):
        url = run(["git", "remote", "get-url", remote])
        if url and (repo := repo_from_url(url)):
            return repo
    return None


def ratio(items: list[str]) -> float | None:
    items = [s for s in items if s.strip()]
    if not items:
        return None
    return sum(1 for s in items if HANGUL.search(s)) / len(items)


def pr_items(repo: str | None) -> list[str]:
    if not repo:
        return []
    out = run(["gh", "pr", "list", "--repo", repo, "--state", "all", "--limit", "20",
               "--json", "title,body"])
    if not out:
        return []
    # 본문은 앞부분만 본다. 템플릿 머리말·로그 붙여넣기에 끌려가지 않도록.
    return [f"{pr['title']} {(pr.get('body') or '')[:300]}" for pr in json.loads(out)]


def commit_items() -> list[str]:
    out = run(["git", "log", "-30", "--no-merges", "--format=%s"])
    return out.splitlines() if out else []


def readme_items() -> list[str]:
    root = run(["git", "rev-parse", "--show-toplevel"])
    if not root:
        return []
    for name in ("README.md", "README.rst", "README.txt", "README"):
        path = Path(root.strip()) / name
        if path.exists():
            lines, in_code = [], False
            for line in path.read_text(errors="ignore").splitlines()[:200]:
                if line.lstrip().startswith("```"):
                    in_code = not in_code
                    continue
                # 코드 블록과 배지·링크만 있는 줄은 언어 판단에 노이즈다.
                if not in_code and re.search(r"[A-Za-z가-힣]{2}", line) and not line.lstrip().startswith(("[!", "![", "<")):
                    lines.append(line)
            return lines
    return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", help="PR을 올릴 대상 저장소 OWNER/NAME (기본: upstream > origin)")
    args = parser.parse_args()

    repo = args.repo or target_repo()
    samples = {"pr_history": pr_items(repo), "commits": commit_items(), "readme": readme_items()}
    signals = {}
    for key, items in samples.items():
        r = ratio(items)
        signals[key] = {"samples": len(items), "hangul_ratio": None if r is None else round(r, 2)}

    used = {k: v["hangul_ratio"] for k, v in signals.items() if v["hangul_ratio"] is not None}
    if not used:
        lang, score, reason = "en", 0.0, "판정할 기록(PR·커밋·README)이 없어 기본값 en"
    else:
        total = sum(WEIGHTS[k] for k in used)
        score = round(sum(WEIGHTS[k] * r for k, r in used.items()) / total, 2)
        lang = "ko" if score >= THRESHOLD else "en"
        parts = ", ".join(f"{k} {r:.0%}" for k, r in used.items())
        reason = f"한글 비율 가중 점수 {score} (기준 {THRESHOLD}) — {parts}"

    print(json.dumps({"lang": lang, "score": score, "target_repo": repo,
                      "signals": signals, "reason": reason}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
