#!/usr/bin/env bash
# Lints the text every Vue template shows, with the project voice in .vale.ini.
#
# Before any template is read, an em-dash in a template written outside the
# tree is linted. If that does not fire, .vale.ini no longer reads .vue files
# and the run would pass by linting nothing, so it refuses. It also refuses an
# empty template list.
#
# Environment:
#   VALE_BIN   path to vale; .vale/bin/vale otherwise. See install-vale.sh.
#
# Exit codes: 0 clean, 1 findings, 2 cannot run.

set -uo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "[ERROR] not inside a git repository; nothing to lint." >&2
  exit 2
}
vale="${VALE_BIN:-$root/.vale/bin/vale}"
ini="$root/.vale.ini"
[ -x "$vale" ] || { echo "[ERROR] vale is not installed at ${vale}." >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
printf '<template>\n  <p>Canary text %s with a dash.</p>\n</template>\n' "$(printf '\xe2\x80\x94')" > "$work/Canary.vue"
if (cd "$work" && "$vale" --config "$ini" --output=line Canary.vue >/dev/null 2>&1); then
  echo "[ERROR] the canary template passed: .vale.ini does not lint .vue files." >&2
  exit 2
fi

mapfile -d '' -t templates < <(git -C "$root" ls-files -z -- 'nuxt/**/*.vue')
if [ "${#templates[@]}" -eq 0 ]; then
  echo "[ERROR] no Vue templates found under nuxt/; nothing to lint." >&2
  exit 2
fi

out="$(cd "$root" && "$vale" --config "$ini" --output=line "${templates[@]}" 2>&1)"
rc=$?
if [ "$rc" -ne 0 ]; then
  printf '%s\n' "$out"
  echo "[FAIL] prose findings across ${#templates[@]} Vue template(s)." >&2
  exit 1
fi
echo "[PASS] prose clean across ${#templates[@]} Vue template(s)."
