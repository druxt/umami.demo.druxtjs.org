#!/usr/bin/env bash
# Lints prose with Vale: the markdown a change touches, the commit messages in
# its range, and the merge request description. All three are content someone
# wrote for this repository, and the project voice applies to all of it.
#
# Usage: lint-prose.sh [--all] [<base-sha>]
#
# Markdown: files added or modified in <base>..HEAD; with --all, every tracked
# markdown file. Without an argument the base is read from PROSE_BASE_SHA,
# then CI_MERGE_REQUEST_DIFF_BASE_SHA, then CI_COMMIT_BEFORE_SHA. With none of
# those the files and message of HEAD alone are read.
#
# Description: MERGE_REQUEST_DESCRIPTION, then CI_MERGE_REQUEST_DESCRIPTION.
# A merge request pipeline with neither is refused, as check-attribution.sh
# does and for the same reason.
#
# Environment:
#   VALE_BIN          path to vale; PATH otherwise. See install-vale.sh.
#   PROSE_LINT_GLOB   passed to `vale --glob` for the repository's markdown,
#                     to keep fixtures and vendored prose out. Never applied
#                     to commit messages or the description: those are never
#                     fixtures.
#
# Before any input is read, an em-dash is written to a file outside the tree
# and linted. If that does not fire, the .vale.ini has no section covering the
# generated inputs and the run would pass by linting nothing, so it refuses.
#
# Exit codes: 0 clean, 1 findings, 2 cannot run.

set -uo pipefail

all=0
base=""
for arg in "$@"; do
  case "$arg" in
    --all) all=1 ;;
    -h|--help) sed -n '2,28p' "$0"; exit 0 ;;
    *) base="$arg" ;;
  esac
done

root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] not inside a git repository; nothing to lint." >&2
  exit 2
}

# VALE_BIN, then PATH, then the repository's own .vale/bin, which is where
# install-vale.sh puts it when a repository installs it for itself.
vale="${VALE_BIN:-$(command -v vale 2>/dev/null || true)}"
if [ -z "$vale" ] && [ -x "$root/.vale/bin/vale" ]; then
  vale="$root/.vale/bin/vale"
fi
if [ -z "$vale" ] || [ ! -x "$vale" ]; then
  echo "[ERROR] vale is not installed. Run install-vale.sh .vale/bin .vale/styles in the repository root, or put vale on PATH." >&2
  exit 2
fi

ini="$root/.vale.ini"
if [ ! -f "$ini" ]; then
  echo "[ERROR] no .vale.ini at ${root}; there is no project voice to apply." >&2
  exit 2
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# --- canary ------------------------------------------------------------------

mkdir -p "$work/canary"
printf 'Canary text %s with a dash.\n' "$(printf '\xe2\x80\x94')" > "$work/canary/canary.md"
canary_out="$(cd "$work/canary" && "$vale" --config "$ini" --output=line canary.md 2>&1)"
canary_rc=$?
if [ "$canary_rc" -eq 0 ] || ! printf '%s' "$canary_out" | grep -q 'canary.md:'; then
  echo "[ERROR] canary did not fire: .vale.ini applies no em-dash rule to files outside the tree, so commit messages and the description would be linted by nothing." >&2
  echo "        Add a section such as [*.md] with BasedOnStyles = ai-tells. Vale said:" >&2
  printf '%s\n' "$canary_out" | sed 's/^/        /' >&2
  exit 2
fi

# --- range -------------------------------------------------------------------

if [ -z "$base" ]; then
  base="${PROSE_BASE_SHA:-${CI_MERGE_REQUEST_DIFF_BASE_SHA:-}}"
fi
if [ -z "$base" ] && [ -n "${CI_COMMIT_BEFORE_SHA:-}" ] \
  && [ "$CI_COMMIT_BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
  base="$CI_COMMIT_BEFORE_SHA"
fi
case "$base" in 0000000000000000000000000000000000000000) base="" ;; esac
if [ -n "$base" ] && ! git cat-file -e "${base}^{commit}" 2>/dev/null; then
  echo "[ERROR] base ${base} is not a commit in this repository." >&2
  exit 2
fi

findings=0

# --- commit messages and the description -------------------------------------

inputs="$work/inputs"
mkdir -p "$inputs/commits"

if [ -n "$base" ]; then
  shas="$(git rev-list "${base}..HEAD")"
else
  shas="$(git rev-parse HEAD)"
fi
commits=0
for sha in $shas; do
  commits=$((commits + 1))
  git log -1 --format=%B "$sha" > "$inputs/commits/$(git rev-parse --short "$sha").md"
done

description_state="no description"
if [ -n "${MERGE_REQUEST_DESCRIPTION+x}" ]; then
  printf '%s\n' "$MERGE_REQUEST_DESCRIPTION" > "$inputs/merge-request.md"
  description_state="the merge request description"
elif [ -n "${CI_MERGE_REQUEST_DESCRIPTION+x}" ]; then
  printf '%s\n' "$CI_MERGE_REQUEST_DESCRIPTION" > "$inputs/merge-request.md"
  description_state="the merge request description"
elif [ -n "${CI_MERGE_REQUEST_IID:-}" ]; then
  echo "[ERROR] merge request pipeline, but the description is not available." >&2
  echo "        GitLab exposes it as CI_MERGE_REQUEST_DESCRIPTION (16.0 and later); other platforms pass MERGE_REQUEST_DESCRIPTION." >&2
  exit 2
fi

generated=()
for f in "$inputs"/commits/*.md "$inputs/merge-request.md"; do
  [ -f "$f" ] && generated+=("${f#"$inputs"/}")
done
if [ "${#generated[@]}" -gt 0 ]; then
  out="$(cd "$inputs" && "$vale" --config "$ini" --output=line "${generated[@]}" 2>&1)"
  rc=$?
  if [ -n "$out" ]; then
    printf '%s\n' "$out"
  fi
  if [ "$rc" -ne 0 ]; then
    findings=$((findings + 1))
  fi
fi

# --- the repository's markdown -----------------------------------------------

markdown=()
if [ "$all" -eq 1 ]; then
  mapfile -d '' -t markdown < <(git -C "$root" ls-files -z -- '*.md')
elif [ -n "$base" ]; then
  mapfile -d '' -t markdown < <(git -C "$root" diff -z --name-only --diff-filter=AMR "$base" HEAD -- '*.md')
else
  mapfile -d '' -t markdown < <(git -C "$root" diff-tree -z --no-commit-id -r --name-only --diff-filter=AMR HEAD -- '*.md')
fi
existing=()
for f in "${markdown[@]}"; do
  [ -f "$root/$f" ] && existing+=("$f")
done

if [ "${#existing[@]}" -gt 0 ]; then
  glob=()
  if [ -n "${PROSE_LINT_GLOB:-}" ]; then
    glob=(--glob="$PROSE_LINT_GLOB")
  fi
  out="$(cd "$root" && "$vale" --config "$ini" --output=line "${glob[@]}" "${existing[@]}" 2>&1)"
  rc=$?
  if [ -n "$out" ]; then
    printf '%s\n' "$out"
  fi
  if [ "$rc" -ne 0 ]; then
    findings=$((findings + 1))
  fi
fi

# --- verdict -----------------------------------------------------------------

scope="${commits} commit message(s), ${description_state}, ${#existing[@]} markdown file(s)"
if [ "$findings" -gt 0 ]; then
  echo "[FAIL] prose findings across ${scope}."
  exit 1
fi
echo "[PASS] prose clean across ${scope}."
