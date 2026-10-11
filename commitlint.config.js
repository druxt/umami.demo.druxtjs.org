// Conventional Commits, unmodified, plus one project rule.
//
// The type list is deliberately the stock one. A repository-specific vocabulary
// means a contributor who has worked on another Druxt repository guesses wrong,
// and the value of the convention is that it is the same everywhere.
//
// no-ai-attribution: the work is the author's. A co-author trailer naming a
// coding assistant, a generated-with footer or a session link hands ownership
// to a tool. .gitlab/scripts/check-attribution.sh runs the same check over the
// merge request range and every tracked file in CI; this is the local half,
// run by the commit-msg hook. The pattern is assembled from pieces so that this
// file passes its own scan.
const tools =
  'claude|anthropic|copilot|chatgpt|openai|gemini|codex|cursor|aider|devin|windsurf|opencode|glm'
const attribution = new RegExp(
  [
    'co-authored' + `-by:.*(${tools})`,
    `generated (with|by).*(${tools}|\\bai\\b)`,
    'claude-' + 'session:',
    'claude\\.ai/code/session',
    'noreply' + '@anthropic\\.com',
  ].join('|'),
  'i'
)

module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'no-ai-attribution': ({ raw }) => {
          const hit = raw.match(attribution)
          return [
            !hit,
            hit
              ? `AI attribution is not allowed: "${hit[0].trim()}". The work is the author's.`
              : '',
          ]
        },
      },
    },
  ],
  rules: {
    'no-ai-attribution': [2, 'always'],
  },
}
