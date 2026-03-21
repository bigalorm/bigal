# LLM Discoverability and Usability for BigAl

**Date:** 2026-03-11
**Status:** Draft

## What We're Building

A multi-pronged initiative to make BigAl discoverable and usable by LLMs — both for developers working with AI coding assistants and for LLMs recommending tools.

### Deliverables

1. **VitePress documentation site** on GitHub Pages with auto-generated API reference, organized guides, getting-started tutorial, and llms.txt/llms-full.txt at the root
2. **Agent skill** following the [agentskills.io specification](https://agentskills.io/specification), published via skills.sh — a single comprehensive skill covering BigAl patterns, model setup, query recipes, and when to use BigAl vs raw SQL
3. **llms.txt** served from the docs site — a curated LLM-friendly summary for any AI tool to fetch
4. **Package.json keyword enrichment** — adding `typescript`, `type-safe`, `query-builder`, `node`, `fluent`, `decorator` to improve npm search and LLM training data
5. **Context7 registration** — getting BigAl indexed so LLMs can fetch docs via the Context7 MCP
6. **Example project** — a small reference app demonstrating BigAl usage end-to-end

## Why This Approach

The primary audience is developers using AI assistants (Claude Code, Cursor, Copilot). The secondary audience is LLMs recommending tools when asked "what ORM should I use for Postgres with TypeScript?"

A single deliverable can't serve both audiences well:

- **Agent skills** provide active, in-editor guidance but only reach developers who've installed the skill
- **Docs sites** are passively discoverable by LLMs but don't provide proactive guidance
- **llms.txt** bridges the gap — any LLM tool can fetch it without prior setup

The three reinforce each other: docs content feeds llms.txt, the skill references the docs, and the docs site links to the skill for installation.

## Key Decisions

### Docs Site: VitePress on GitHub Pages

- VitePress chosen for its simplicity, TypeScript-native ecosystem, and markdown-first approach
- GitHub Pages for zero-cost, zero-maintenance hosting under the bigalorm org
- Auto-generated API reference from TypeScript types (via TypeDoc or similar)
- Existing README and docs/ content restructured into proper site navigation
- llms.txt and llms-full.txt generated as part of the build

### Agent Skill: Single Comprehensive Skill

- One skill covering the full BigAl surface: model definition, query building, when to use BigAl vs raw SQL
- Follows [agentskills.io spec](https://agentskills.io/specification) and [Vercel skills conventions](https://github.com/vercel-labs/skills)
- Progressive disclosure: SKILL.md body stays under 500 lines, detailed reference in `references/` directory
- Published to skills.sh for discovery and `npx skills install`
- Skill includes:
  - When to use BigAl (vs raw SQL, vs other ORMs)
  - Model definition patterns (decorators, relationships, lifecycle methods)
  - Query building recipes (common patterns, joins, subqueries)
  - Gotchas and common mistakes
  - Links to docs site for deeper reference

### llms.txt Format

- Follows [llmstxt.org spec](https://llmstxt.org/)
- H1: BigAl — Type-safe PostgreSQL ORM for Node.js/TypeScript
- Blockquote: key differentiators (fluent builder, immutable queries, PromiseLike, decorator-based models)
- Sections: Getting Started, Models, Querying, Relationships, Advanced (subqueries, joins, views)
- llms-full.txt: comprehensive version with all API details

### Package.json Keywords

Current: `["orm", "postgres", "postgresql"]`

Proposed: `["orm", "postgres", "postgresql", "typescript", "type-safe", "query-builder", "node", "fluent-api", "decorator", "repository-pattern"]`

### Context7 Registration

- Submit BigAl to Context7 for indexing
- Ensures LLMs with Context7 MCP access can fetch BigAl documentation on demand

### Example Project

- Small, focused reference app (e.g., a simple REST API with a few models)
- Demonstrates: model definition, repository setup, CRUD operations, relationships, querying
- Lives in the bigalorm org as a separate repo or in a `examples/` directory

## Open Questions

1. **Docs site URL**: `bigalorm.github.io/bigal` or a custom domain?
2. **API reference generation**: TypeDoc, or VitePress plugin that reads `.d.ts` files directly?
3. **Example project scope**: Standalone repo or `examples/` directory in the main repo? What kind of app (REST API, CLI tool)?
4. **Context7 submission process**: What's required to get indexed? Is there a submission form or is it automatic from npm?
5. **Skill hosting**: Published only via skills.sh, or also offered as a directory in the BigAl repo itself (e.g., `.skills/bigal/SKILL.md`)?
6. **CLAUDE.md staleness**: The current CLAUDE.md references Mocha (tests use Vitest) and `npx tsc --noEmit` (actual command is `tsgo`). Should fixing this be part of this initiative?

## Out of Scope

- Rewriting the ORM itself
- Adding new ORM features
- Migration tooling or CLI
- Supporting databases other than PostgreSQL
