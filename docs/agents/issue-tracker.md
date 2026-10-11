# Issue tracker: Linear

Issues and specs for this repo live in **Linear** (workspace "SPTushonka Leaderboard", `linear.app/sptlb`). GitHub Issues on `SPT-Leaderboard/Website` are NOT used for tracking — the repo is public and the project prefers a private tracker. GitHub remains in use for the code, PRs, and releases only.

## Access

- Preferred: the `linear` MCP server (tools like `list_issues`, `save_issue`, `list_projects`, `save_project`, `create_issue_label`). It is registered in `~/.pi/agent/mcp.json`; tools appear natively in sessions started after registration.
- Fallback (same auth, no MCP client): JSON-RPC over HTTP. The OAuth token is in `~/.pi/agent/mcp-auth.json` under `mcp__linear|https://mcp.linear.app/mcp` `.tokens.access_token`. The token is a secret — never print it; extract it into a shell variable.

```bash
TOKEN=$(jq -r '.["mcp__linear|https://mcp.linear.app/mcp"].tokens.access_token' ~/.pi/agent/mcp-auth.json)
curl -s -X POST https://mcp.linear.app/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_issues","arguments":{}}}' \
  | sed -n 's/^data: //p' | jq -r '.result.content[0].text'
```

The server is stateless: no `initialize` handshake or session header is required, but send real newlines in markdown (no `\n` escapes) per its instructions.

## Conventions

- **Create an issue**: `save_issue` with `team`, `title`, `description`. The description carries the full spec.
- **Category issues**: one parent issue per category; child issues link via `parentId`. A category closes only after `Human Review`.
- **Read / list**: `get_issue`, `list_issues` with filters.
- **Statuses**: use the team's Linear statuses. Per-task automated review = the review status; whole-category sign-off = the same status plus the `ready-for-human` label.
- **Labels**: the five canonical triage labels exist as Linear labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

## When a skill says "publish to the issue tracker"

Create a Linear issue in the frontend team.

## When a skill says "fetch the relevant ticket"

Read it with `get_issue`.

## Security rules for public text

This repo is PUBLIC. Issue bodies and comments in Linear are private, but anything that also lands in the repo (commit messages, PR text, code comments) must not carry: local absolute paths, the production domains, infra details. Use repo-relative paths and the wording "the API subdomain".

## Legacy GitHub setup

The GitHub triage labels (`needs-triage` etc.) still exist on `SPT-Leaderboard/Website` from the earlier GitHub-tracker setup. They are unused. The "Agentic Optimization Bonanza" GitHub project board is retired in favor of Linear.
