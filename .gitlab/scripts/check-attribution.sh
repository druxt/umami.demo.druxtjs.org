#!/usr/bin/env bash
# Rejects AI authorship claims in commits, the merge request description and
# tracked files. The work is the author's; a tool takes no credit for it.
#
# Usage: check-attribution.sh [--files-only] [<base-sha>]
#
# Commits: the range <base>..HEAD. Without an argument the base is read from
# ATTRIBUTION_BASE_SHA, then CI_MERGE_REQUEST_DIFF_BASE_SHA, then
# CI_COMMIT_BEFORE_SHA. With none of those only HEAD is read.
#
# Description: MERGE_REQUEST_DESCRIPTION, then CI_MERGE_REQUEST_DESCRIPTION.
# When GITLAB_API_TOKEN, CI_API_V4_URL, CI_PROJECT_ID and CI_MERGE_REQUEST_IID
# are all set the description is fetched instead, because the variable is cut
# at 2700 characters and a footer sits at the end. On a merge request pipeline
# with no description from either source the check refuses: passing over a
# description it never read is not a pass.
#
# Files: every tracked text file, whatever the range.
#
# Exit codes: 0 clean, 1 attribution found, 2 cannot run.
#
# The rejected strings are assembled from fragments below, so this file passes
# its own scan. Keep them that way.

set -uo pipefail

files_only=0
base=""
for arg in "$@"; do
  case "$arg" in
    --files-only) files_only=1 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) base="$arg" ;;
  esac
done

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "[ERROR] not inside a git repository; nothing to check." >&2
  exit 2
fi

# Tool names that must not appear as an author, co-author or generator.
tools='claude|anthropic|copilot|chatgpt|openai|gemini|codex|cursor|aider|devin|windsurf|opencode|glm'

# Each alternative in pieces: the trailer key, the footer, the session link
# and the noreply address are the four shapes seen in practice.
trailer='co-authored'"-by:.*(${tools})"
footer="generated (with|by).*(${tools}|\\bai\\b)"
session='claude-'"session:|claude\\.ai/code/session"
address='noreply'"@anthropic\\.com"
pattern="(${trailer})|(${footer})|(${session})|(${address})"

failures=0
report() {
  echo "[FAIL] $1"
  failures=$((failures + 1))
}

# --- commits -----------------------------------------------------------------

commits_checked=0
if [ "$files_only" -eq 0 ]; then
  if [ -z "$base" ]; then
    base="${ATTRIBUTION_BASE_SHA:-${CI_MERGE_REQUEST_DIFF_BASE_SHA:-}}"
  fi
  if [ -z "$base" ] && [ -n "${CI_COMMIT_BEFORE_SHA:-}" ] \
    && [ "$CI_COMMIT_BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
    base="$CI_COMMIT_BEFORE_SHA"
  fi

  # An all-zero sha is what GitHub passes as the previous commit of a first
  # push, and what GitLab passes as CI_COMMIT_BEFORE_SHA for a new branch.
  case "$base" in 0000000000000000000000000000000000000000) base="" ;; esac

  if [ -n "$base" ]; then
    if ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
      echo "[ERROR] base ${base} is not a commit in this repository." >&2
      exit 2
    fi
    shas="$(git rev-list "${base}..HEAD")"
  else
    shas="$(git rev-parse HEAD)"
  fi

  for sha in $shas; do
    commits_checked=$((commits_checked + 1))
    short="$(git rev-parse --short "$sha")"
    while IFS= read -r line; do
      [ -n "$line" ] && report "commit ${short}: ${line}"
    done < <(git log -1 --format=%B "$sha" | grep -iE "$pattern" || true)
  done
fi

# --- merge request description -----------------------------------------------

description_checked=0
if [ "$files_only" -eq 0 ]; then
  description=""
  have_description=0

  if [ -n "${GITLAB_API_TOKEN:-}" ] && [ -n "${CI_API_V4_URL:-}" ] \
    && [ -n "${CI_PROJECT_ID:-}" ] && [ -n "${CI_MERGE_REQUEST_IID:-}" ]; then
    url="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}"
    payload="$(curl -sSf --header "PRIVATE-TOKEN: ${GITLAB_API_TOKEN}" "$url" 2>/dev/null || true)"
    if [ -n "$payload" ]; then
      if command -v python3 >/dev/null 2>&1; then
        description="$(printf '%s' "$payload" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("description") or "")')"
      elif command -v node >/dev/null 2>&1; then
        description="$(printf '%s' "$payload" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>process.stdout.write(JSON.parse(d).description||""))')"
      fi
      have_description=1
    fi
  fi

  if [ "$have_description" -eq 0 ]; then
    if [ -n "${MERGE_REQUEST_DESCRIPTION+x}" ]; then
      description="$MERGE_REQUEST_DESCRIPTION"
      have_description=1
    elif [ -n "${CI_MERGE_REQUEST_DESCRIPTION+x}" ]; then
      description="$CI_MERGE_REQUEST_DESCRIPTION"
      have_description=1
      if [ "${#description}" -ge 2700 ]; then
        echo "[WARN] CI_MERGE_REQUEST_DESCRIPTION is cut at 2700 characters; set GITLAB_API_TOKEN so the full description is read." >&2
      fi
    elif [ -n "${CI_MERGE_REQUEST_IID:-}" ]; then
      echo "[ERROR] merge request pipeline, but the description is not available." >&2
      echo "        GitLab exposes it as CI_MERGE_REQUEST_DESCRIPTION (16.0 and later); other platforms pass MERGE_REQUEST_DESCRIPTION." >&2
      exit 2
    fi
  fi

  if [ "$have_description" -eq 1 ]; then
    description_checked=1
    while IFS= read -r line; do
      [ -n "$line" ] && report "merge request description: ${line}"
    done < <(printf '%s\n' "$description" | grep -iE "$pattern" || true)
  fi
fi

# --- tracked files -----------------------------------------------------------

files_checked="$(git ls-files | wc -l | tr -d ' ')"
while IFS= read -r line; do
  [ -n "$line" ] && report "$line"
done < <(git grep -nIiE "$pattern" -- . || true)

# --- verdict -----------------------------------------------------------------

scope="${files_checked} tracked files"
if [ "$files_only" -eq 0 ]; then
  scope="${commits_checked} commits, $([ "$description_checked" -eq 1 ] && echo 'the merge request description' || echo 'no description'), ${scope}"
fi

if [ "$failures" -gt 0 ]; then
  echo "[FAIL] ${failures} attribution line(s) across ${scope}. The work is the author's; remove the credit."
  exit 1
fi
echo "[PASS] no AI attribution in ${scope}."
