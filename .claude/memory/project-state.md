## Status

steps 1-8 done: CLAUDE.md, react-component skill, new-component command, code-reviewer sub-agent, two working hooks.

## Key decisions

- Skill: functional components only, src/components/<Name>/<Name>.tsx, plain CSS co-located (no CSS modules/styled-components — keep toolchain minimal), explicit interface <Name>Props, no test file (no runner configured).
- Command: kept thin — delegates to the skill instead of duplicating its conventions; verifies via npm run build (Vite's real build script, not a CRA-style serve -s build).
- Subagent: read-only tools only (Read, Grep, Glob, Bash scoped to git diff/git status); reviews diffs only, not the whole codebase; flags correctness/version-mismatch/subscription-leak/prop-type bugs, ignores style.
- Hooks: PreToolUse on Bash blocks destructive commands (rm -rf, force-push, reset --hard, recursive chmod 777) — had to rewrite the JSON parsing from jq to node because jq wasn't on your Git Bash PATH and was silently failing open. SessionStart prints a git snapshot. Dropped a "missing spec" reminder hook since there's no test setup yet — revisit if that changes.
- Recurring theme: several early drafts (routing, CRA build commands, ng CLI commands, spec-file reminders) carried over Angular/other-framework habits — worth a line noting that, since it's the kind of thing that'll bite again on step 7/8 if not watched for.

## Next steps 

Step 9 (commit and push to github repo)