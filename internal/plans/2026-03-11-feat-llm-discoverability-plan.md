---
title: LLM Discoverability and Usability
type: feat
date: 2026-03-11
---

# LLM Discoverability and Usability

## Enhancement Summary

**Deepened on:** 2026-03-11
**Agents used:** 12 (create-agent-skills, agent-native-architecture, frontend-design, architecture-strategist, agent-native-reviewer, code-simplicity-reviewer, kieran-typescript-reviewer, best-practices-researcher x2, framework-docs-researcher x2, performance-oracle)

### Key Improvements from Deepening

1. **Use `vitepress-plugin-llms`** — auto-generates both `llms.txt` and `llms-full.txt` from VitePress docs. Used by Vite, Vue.js, Vitest, and Rolldown. Eliminates custom generation script entirely.
2. **Drop TypeDoc** — tsgo (native TypeScript compiler) is incompatible with TypeDoc's compiler API. Hand-write API reference pages instead (higher quality, no dependency headache).
3. **Separate `docs/package.json`** — isolate VitePress dependencies from the ORM's devDependencies to avoid slowing CI for contributors.
4. **Rename skill to `using-bigal`** — gerund naming convention per agentskills.io best practices. Add required Quick Start and Success Criteria sections. Drop reference files; link to docs site instead.
5. **SQL-to-BigAl translation table** — highest-leverage agent artifact for code generation. Include in skill and docs.
6. **Verify `.agents/` in npm package** — critical for agent discovery in consumer projects.
7. **Raise llms-full.txt budget to 5,000 lines** — modern context windows handle this easily; prevents content parity gaps.
8. **Add sRGB fallback values** for oklch colors (browser compatibility).
9. **Move brainstorms/plans out of `docs/`** — structural boundary between published and internal content.
10. **Comprehensive dark theme CSS** — oklch palette with DM Sans/Source Sans 3/JetBrains Mono typography, custom syntax highlighting for both TypeScript and SQL tokens.
11. **Context7 registration via `context7.json`** — not automatic from npm. Submit at context7.com/add-library or add `context7.json` to repo root.
12. **skills.sh publication is organic** — no formal submission. Create public repo, share `npx skills add owner/repo`, appears on leaderboard via install telemetry.
13. **Use `appearance: 'force-dark'`** — forces dark mode with no toggle (not `'dark'` which allows toggle).
14. **Import `vitepress/theme-without-fonts`** — when providing custom fonts (DM Sans, Source Sans 3), skip the bundled Inter font.

### New Considerations Discovered

- VitePress `srcExclude` or structural relocation needed for internal docs (brainstorms, plans)
- `robots.txt` and `<link rel="llms-txt">` meta tag needed for agent crawler discoverability
- Trimmed README needs explicit "Machine-Readable Documentation" section with llms.txt URLs
- CLAUDE.md should reference consumer skill for agents reading BigAl from `node_modules`
- Error message catalog in skill is high-value for agent debugging

## Overview

Make BigAl discoverable and usable by LLMs through a VitePress documentation site, an agent skill following the agentskills.io specification, and llms.txt files.
Additionally, enrich package.json metadata and register with Context7.

**Primary audience:** Developers using AI coding assistants (Claude Code, Cursor, Copilot).
**Secondary audience:** LLMs recommending tools when asked about Postgres ORMs for TypeScript.

## Problem Statement

BigAl has excellent documentation (1,437-line README + 3 supplemental guides), but it is all trapped in GitHub markdown:

- No documentation website for search engines or LLMs to index
- No agent skill for proactive in-editor guidance
- No llms.txt for machine-readable library summaries
- Package.json keywords are sparse (only 3: `orm`, `postgres`, `postgresql`)
- Not indexed by Context7 for MCP-based retrieval
- CLAUDE.md contains stale references (Mocha, ESLint, `tsc`) that cause incorrect AI behavior

## Proposed Solution

Five deliverables in four phases:

1. **Phase 0 (Prerequisites):** Fix CLAUDE.md staleness, fix README code bug, enrich package.json keywords, verify `.agents/` in npm package
2. **Phase 1 (Core):** VitePress docs site on GitHub Pages + llms.txt + llms-full.txt
3. **Phase 2 (AI Tooling):** Agent skill (agentskills.io spec) + Context7 registration
4. **Phase 3 (Cutover):** Trim README, update package.json homepage, cross-link everything

## Technical Approach

### Design Direction

- **Dark theme by default** — dark background with slate accents, inspired by Veerle Pieters' color palette aesthetics
- **Modern CSS** — use `oklch()` color space with sRGB fallbacks for perceptually uniform colors
- **VitePress custom theme** — extend the default theme with custom CSS variables for the dark palette
- **Typography** — DM Sans (headings), Source Sans 3 (body), JetBrains Mono (code) via Google Fonts
- **Code blocks as hero element** — recessed dark wells with subtle accent glow, separate syntax token colors for TypeScript and SQL

<details>
<summary>oklch color palette (with sRGB fallbacks)</summary>

```css
:root {
  /* Core surfaces — hue 260 (blue-slate) throughout for chromatic cohesion */
  --bigal-bg-deep: oklch(0.14 0.012 260); /* #1a1c2e fallback */
  --bigal-bg: oklch(0.17 0.012 260); /* #212336 fallback */
  --bigal-surface: oklch(0.21 0.015 260); /* #2a2d42 fallback */
  --bigal-surface-raised: oklch(0.25 0.015 260); /* #33364e fallback */
  --bigal-border: oklch(0.3 0.015 260); /* #3d4059 fallback */

  /* Text hierarchy */
  --bigal-text: oklch(0.92 0.008 260); /* #e8e9f0 fallback */
  --bigal-text-muted: oklch(0.7 0.012 260); /* #a3a6b8 fallback */
  --bigal-text-faint: oklch(0.55 0.012 260); /* #7d8094 fallback */

  /* Accent — muted blue-slate */
  --bigal-accent: oklch(0.62 0.14 250); /* #5b7ec9 fallback */
  --bigal-accent-hover: oklch(0.68 0.16 250); /* #7094e0 fallback */
  --bigal-accent-text: oklch(0.72 0.12 250); /* #8aa8e8 fallback */

  /* Warm counterpoint — amber/sand for warnings */
  --bigal-warm: oklch(0.68 0.12 55); /* #c9a050 fallback */

  /* Code blocks */
  --bigal-code-bg: oklch(0.12 0.014 260); /* #151728 fallback */
  --bigal-code-border: oklch(0.24 0.015 260); /* #2f3248 fallback */

  /* Syntax: TypeScript tokens */
  --bigal-syn-keyword: oklch(0.72 0.12 300); /* dusty violet */
  --bigal-syn-string: oklch(0.72 0.1 155); /* sage green */
  --bigal-syn-function: oklch(0.78 0.1 230); /* steel blue */
  --bigal-syn-type: oklch(0.72 0.14 250); /* matches accent */
  --bigal-syn-comment: oklch(0.5 0.015 260); /* quiet grey */

  /* Syntax: SQL tokens (distinct from TypeScript) */
  --bigal-syn-sql-keyword: oklch(0.72 0.14 250); /* accent-aligned */
  --bigal-syn-sql-table: oklch(0.78 0.1 160); /* teal green */
  --bigal-syn-sql-string: oklch(0.72 0.1 55); /* warm amber */

  /* Typography */
  --bigal-font-display: 'DM Sans', sans-serif;
  --bigal-font-body: 'Source Sans 3', sans-serif;
  --bigal-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

</details>

### Automation Principles

All documentation artifacts must be **fully automated** — no manual steps to keep docs in sync:

- **llms.txt + llms-full.txt** auto-generated by `vitepress-plugin-llms` at build time (no custom script needed). This plugin is used by Vite, Vue.js, Vitest, and Rolldown.
- **API reference** hand-written (not auto-generated — TypeDoc is incompatible with tsgo/native-preview)
- **Docs deployment** via GitHub Actions on push to main (changes in `docs/`)
- **Build scripts** in `docs/package.json`: `dev`, `build`, `preview`
- **Generated files** (`llms.txt`, `llms-full.txt`) are produced in `.vitepress/dist` at build time (not committed to repo)

### Architecture

```
bigalorm/bigal repo
├── docs/                          # VitePress source (separate package.json)
│   ├── package.json               # VitePress + docs-only dependencies
│   ├── .vitepress/
│   │   ├── config.ts              # VitePress configuration (includes vitepress-plugin-llms)
│   │   └── theme/
│   │       ├── index.ts           # Custom theme extending default
│   │       └── custom.css         # Dark theme with oklch colors
│   ├── index.md                   # Landing page
│   ├── getting-started.md         # Install, configure, first query (single page)
│   ├── guide/
│   │   ├── models.md              # Decorators, Entity, NotEntity, relationships
│   │   ├── querying.md            # findOne, find, count, operators, JSONB, pagination
│   │   ├── crud-operations.md     # create, update, destroy
│   │   ├── relationships.md       # Existing doc, restructured
│   │   ├── subqueries-and-joins.md  # Existing doc, restructured
│   │   └── views.md               # Existing doc, restructured
│   ├── reference/
│   │   ├── api.md                 # Hand-written: decorators, repository methods, key types
│   │   └── configuration.md       # InitializeOptions, drivers, DEBUG_BIGAL
│   ├── advanced/
│   │   ├── bigal-vs-raw-sql.md    # Decision framework + SQL-to-BigAl translation table
│   │   └── known-issues.md        # NotEntity workaround, debugging, error patterns
│   ├── public/
│   │   └── robots.txt             # Explicitly allow AI crawlers
│   └── .gitignore                 # Ignores .vitepress/dist, .vitepress/cache
├── internal/                      # Non-published planning artifacts
│   ├── brainstorms/               # Moved from docs/brainstorms/
│   └── plans/                     # Moved from docs/plans/
├── .agents/
│   └── skills/
│       ├── enforcing-typescript-standards/  # Existing (contributor skill)
│       └── using-bigal/                     # NEW: consumer skill
│           └── SKILL.md                     # Links to docs site for deep reference
├── llms.txt                       # Root-level copy for repo-browsing agents
└── .github/
    └── workflows/
        └── docs.yml               # NEW: VitePress deploy workflow
```

**Key structural decisions from deepening:**

- **`docs/package.json`** — VitePress and docs dependencies isolated from ORM devDependencies. Contributors running `npm ci` at root never install VitePress.
- **`internal/` directory** — Brainstorms and plans moved out of `docs/` to avoid VitePress processing them as publishable pages.
- **No custom generation script** — `vitepress-plugin-llms` handles llms.txt and llms-full.txt generation at build time.
- **No TypeDoc** — tsgo (native TypeScript compiler) is incompatible with TypeDoc's compiler API. API reference is hand-written markdown.
- **No skill `references/` directory** — Skill links to docs site pages for deep dives. One source of truth, no content drift.
- **Root `llms.txt`** — Copy of the generated llms.txt at repo root for agents browsing the repo directly (not via docs site).

### Implementation Phases

#### Phase 0: Prerequisites

Quick fixes that should land as a single PR before the main work begins.

**Tasks:**

- [x] Fix CLAUDE.md stale references:
  - `CLAUDE.md`: Change "Run all tests with Mocha" to "Run all tests with Vitest"
  - `CLAUDE.md`: Change "Run ESLint and markdownlint" to "Run oxlint, oxfmt, and markdownlint"
  - `CLAUDE.md`: Change `npx tsc --noEmit` to `npm run check:types` (runs `tsgo --noEmit --skipLibCheck`)
  - `CLAUDE.md`: Change `.tests.ts` suffix reference to `.test.ts`
- [x] Fix README code bug at line ~190: `= Object.entries(repositoriesByName)` should be `of Object.entries(repositoriesByName)`
- [x] Enrich `package.json` keywords: `["orm", "postgres", "postgresql", "typescript", "type-safe", "query-builder", "node", "fluent-api", "decorator", "repository-pattern"]`
- [x] Enrich `package.json` description to mention type-safety: `"A type-safe PostgreSQL ORM for Node.js, written in TypeScript. Features a fluent query builder, decorator-based models, and immutable query state."`
- [x] Verify `.agents/` directory is included in the published npm package — confirmed: `.npmignore` does not exclude `.agents/`, so it is included by default.

**Success criteria:** CLAUDE.md is accurate, README code samples compile, keywords are enriched, `.agents/` confirmed in npm tarball.

#### Phase 1: VitePress Docs Site + llms.txt

The largest phase. Restructure existing content into a VitePress site and deploy to GitHub Pages.

**Tasks:**

- [x] Move `docs/brainstorms/` and `docs/plans/` to `internal/brainstorms/` and `internal/plans/`
  - Update any references (e.g., this plan file itself)
- [x] Create `docs/package.json` with VitePress and docs-only dependencies
  - Install `vitepress` as a dependency in `docs/package.json` (not root)
  - Keep root `package.json` clean — no VitePress contamination
- [x] Initialize VitePress in the `docs/` directory
  - Create `docs/.vitepress/config.ts` with:
    - `appearance: 'force-dark'` (dark mode only, no toggle)
    - `base: '/bigal/'` (GitHub Pages subpath)
    - Sidebar configuration (single source of truth for page ordering)
    - Nav, search (built-in local/minisearch), site metadata
    - Google Fonts preconnect for DM Sans, Source Sans 3, JetBrains Mono
    - `<link rel="llms-txt" href="/bigal/llms.txt">` meta tag for agent discoverability
  - Create `docs/.vitepress/theme/index.ts` extending `vitepress/theme-without-fonts` (custom fonts replace bundled Inter)
  - Create `docs/.vitepress/theme/custom.css` with dark oklch color palette (sRGB fallbacks for each color), typography, code block styling, syntax highlighting overrides
  - Add scripts to `docs/package.json`:
    - `dev` — `vitepress dev`
    - `build` — `vitepress build` (vitepress-plugin-llms generates llms.txt/llms-full.txt automatically during build)
    - `preview` — `vitepress preview`
  - Create `docs/.gitignore` — `.vitepress/dist`, `.vitepress/cache`
- [x] Create docs site landing page (`docs/index.md`)
  - Hero section: BigAl tagline, install command, "Get Started" button
  - Feature highlights: type-safe queries, decorator models, fluent builder, immutable state
- [x] Create Getting Started page (`docs/getting-started.md`)
  - npm install + driver compatibility (pg, postgres-pool, @neondatabase/serverless)
  - `initialize()` function, `PoolLike` interface, minimal `InitializeOptions`
  - Define a model, create a repository, run a find query — **copy-paste-complete example** with all imports
- [x] Create Guide section (restructure README content)
  - `docs/guide/models.md` — `@table`, `@column`, `@primaryColumn`, `@createDateColumn`, `@updateDateColumn`, `@versionColumn`, Entity base class, `NotEntity<T>`, relationship patterns
  - `docs/guide/querying.md` — `findOne`, `find`, `count`, `WhereQuery`, operators (like, gt, lt, in, or, and), JSONB querying, pagination (`skip`, `limit`, `paginate`, `withCount`)
  - `docs/guide/crud-operations.md` — `create`, `update`, `destroy`, `CreateUpdateParams`
  - `docs/guide/relationships.md` — migrate existing `docs/relationships.md` content
  - `docs/guide/subqueries-and-joins.md` — migrate existing `docs/subqueries-and-joins.md` content
  - `docs/guide/views.md` — migrate existing `docs/views-and-readonly-repositories.md` content
- [x] Create Reference section (hand-written, not auto-generated)
  - `docs/reference/api.md` — decorator options, `Repository`/`ReadonlyRepository` method signatures, key types (`QueryResult`, `QueryResultPopulated`, `WhereQuery`, `Sort`, `FindArgs`, `FindOneArgs`, `PopulateArgs`, `PaginateOptions`, `PoolLike`, `NotEntity`). Curated: only user-facing API, omit metadata internals.
  - `docs/reference/configuration.md` — `InitializeOptions`, `IConnection`, driver setup variants, `DEBUG_BIGAL`, `QueryError`
- [x] Create Advanced section
  - `docs/advanced/bigal-vs-raw-sql.md` — decision framework (new content) + **SQL-to-BigAl translation table** mapping common SQL patterns to BigAl equivalents (WHERE, IN, LIKE, IS NULL, ORDER BY, LIMIT, JOIN, etc.)
  - `docs/advanced/known-issues.md` — `NotEntity<T>` workaround, optional collections, driver quirks, debugging with `DEBUG_BIGAL=true`, common error messages and their causes
- [x] Configure `vitepress-plugin-llms` for llms.txt and llms-full.txt generation
  - Add `vitepress-plugin-llms` to `docs/package.json` devDependencies
  - Import and configure in `docs/.vitepress/config.ts` (the plugin integrates with VitePress's build pipeline)
  - Both `llms.txt` and `llms-full.txt` are auto-generated at build time and placed in the output directory
  - No hand-curated files, no custom scripts — the plugin reads docs source and generates both files
  - Target llms-full.txt under 5,000 lines (modern context windows handle this)
- [x] Copy generated `llms.txt` to repo root for repo-browsing agents (can be a post-build step or manually maintained)
- [x] Create `docs/public/robots.txt` — explicitly allow AI crawlers
- [x] Create GitHub Actions workflow for docs deployment (`.github/workflows/docs.yml`)
  - Trigger: push to `main` branch (changes in `docs/` directory)
  - Steps: checkout, setup Node with `cache: 'npm'`, `cd docs && npm ci && npm run build`, deploy to GitHub Pages
  - Use `actions/deploy-pages` for deployment
  - Add `concurrency: { group: pages, cancel-in-progress: true }` to prevent wasted deployments
  - Add `paths` filter including `docs/**` and `package.json`
- [ ] Configure GitHub repo settings for Pages deployment (source: GitHub Actions) — **manual step, document explicitly**
- [x] Verify markdownlint compatibility with VitePress frontmatter and custom containers early

**Success criteria:** Docs site live at `bigalorm.github.io/bigal`, all existing content migrated, `llms.txt` and `llms-full.txt` accessible, search works.

#### Phase 2: Agent Skill + Context7

Create the consumer-facing agent skill and register with Context7.

**Tasks:**

- [x] Create `skills/using-bigal/SKILL.md`
  - Frontmatter following agentskills.io spec (simplified — no non-spec fields):

    ```yaml
    name: using-bigal
    description: >-
      Type-safe PostgreSQL ORM guidance for BigAl. Use when importing bigal,
      defining Entity models with decorators, writing WhereQuery filters,
      using Repository patterns, or deciding between BigAl and raw SQL.
      Covers model definition, fluent query building, joins, subqueries,
      pagination, JSONB querying, and common gotchas.
    ```

  - Body sections (target: under 500 lines, use markdown headings for consistency with existing project skill):
    - **Objective** — one clear statement of what this skill provides
    - **Quick Start** — copy-paste-complete example: model definition + repository + query (15-20 lines). All imports explicit. **Required per spec.**
    - **When to Use BigAl vs Raw SQL** — decision framework with concrete criteria
    - **SQL-to-BigAl Translation Table** — maps common SQL → BigAl code (WHERE, IN, LIKE, NULL, ORDER BY, LIMIT, JOIN). Highest-leverage artifact for agent code generation.
    - **Model Definition** — decorators, relationships, Entity/NotEntity. Link to docs for details.
    - **Query Patterns** — findOne, find, count, create, update, destroy. Brief examples with SQL equivalents.
    - **Gotchas** — NotEntity workaround, optional collections, immutable query state, common error messages and causes
    - **Success Criteria** — how the agent knows it applied the skill correctly. **Required per spec.** Checklist: uses decorators on Entity subclass, uses fluent builder (not raw SQL strings), uses repository methods for CRUD, treats query state as immutable, uses `NotEntity<T>` for non-table-backed models.
    - **Further Reading** — links to docs site pages for deep dives (not duplicated content)
  - **No `references/` directory** — SKILL.md links to docs site pages. One source of truth.
  - Use consistent terminology throughout: `WhereQuery` (not "where clause"), `Entity` (not "model base class"), `Repository`/`ReadonlyRepository` (not "DAO"), "fluent builder" (not "query builder")

- [ ] Publish skill to skills.sh registry
  - Verify compliance with agentskills.io spec using `skills-ref validate`
  - Submit for discovery via skills.sh
- [x] Register with Context7
  - [x] Create `context7.json` in repo root (see "Context7 Submission" in Recommended Skills section for schema)
  - [ ] Submit at `context7.com/add-library` with GitHub URL after docs site is live — **manual step**
  - [ ] Claim ownership via admin panel — **manual step**
  - [ ] Verify indexing with Context7 MCP: `resolve-library-id` → `query-docs` — **manual step**

**Success criteria:** Skill installable via `npx skills install using-bigal`, Context7 returns BigAl docs on query.

#### Phase 3: Cutover

Tie everything together with cross-links and the README trim.

**Tasks:**

- [x] Update `package.json` homepage to `https://bigalorm.github.io/bigal/`
- [x] Trim README to ~100-200 lines (101 lines)
- [x] Add consumer skill reference to CLAUDE.md
- [x] Add cross-links (docs sidebar, getting-started AI section, llms.txt absolute URLs, SKILL.md links)
- [x] Remove old standalone docs that were migrated
- [x] Verify all links work: lint passes, no broken references

**Success criteria:** README is concise with machine-readable doc pointers, homepage points to docs site, all cross-links work, no broken links.

## Alternative Approaches Considered

### Skills-first, lightweight docs

Ship the agent skill immediately with just llms.txt added to the repo (no docs site). Fastest to deliver but misses the "LLMs recommending tools" angle entirely. The skill would have nowhere to link for deep reference. Rejected because the docs site is the foundation that makes the other deliverables more valuable.

### Docs site only (no skill)

Build the docs site with llms.txt and rely on passive discovery. Simpler to maintain but developers using AI assistants get no proactive guidance. Rejected because the primary audience is developers with AI tools.

### TypeDoc standalone site instead of VitePress

Use TypeDoc to generate the entire docs site from JSDoc/types. Would produce comprehensive API docs but poor narrative documentation. BigAl's existing guides are narrative-heavy with SQL equivalents — these are better as hand-written VitePress pages.

### TypeDoc integrated with VitePress (typedoc-plugin-markdown)

Considered using TypeDoc to auto-generate the API reference section. **Rejected after deepening:** tsgo (the native TypeScript compiler used by this project) does not expose the JavaScript compiler API that TypeDoc requires. Using TypeDoc would require maintaining the standard `typescript` package alongside `@typescript/native-preview` solely for doc generation, creating a fragile dependency. The public API surface is small enough (~15 key exports) that hand-written reference pages are higher quality and lower maintenance.

### Skill with `references/` directory

The agentskills.io spec supports progressive disclosure via reference files. Considered but **rejected after deepening:** three reference files duplicating docs site content creates content drift risk. Multiple reviewers agreed: the skill should link to docs pages for deep dives, not maintain parallel copies. One source of truth.

### Example project

A standalone or in-repo example app was considered and deferred. The docs site will contain extensive copy-paste-complete code examples, and a separate example project adds maintenance burden with risk of staleness. Can be revisited later.

### 15+ pages docs site

The initial plan had 15+ pages including separate pages for operators, pagination, decorators, types, and debugging. **Simplified after deepening:** consolidated to ~12 pages. Getting started is one page (not three). Operators and pagination merged into querying. Decorators, repository methods, and types merged into a single API reference page. Debugging merged into known issues.

## Acceptance Criteria

### Functional Requirements

- [ ] Docs site is live at `bigalorm.github.io/bigal` and auto-deploys on push to main
- [ ] All existing documentation content is migrated to the docs site with no content loss
- [ ] `llms.txt` is accessible at `bigalorm.github.io/bigal/llms.txt` and follows llmstxt.org spec
- [ ] `llms-full.txt` is accessible and under 5,000 lines
- [ ] Agent skill passes `skills-ref validate` and is installable via skills.sh
- [ ] Skill includes Quick Start, SQL-to-BigAl translation table, Success Criteria, and Gotchas
- [ ] Package.json has enriched keywords (10 terms) and updated homepage/description
- [ ] `.agents/` directory is confirmed in the published npm package
- [ ] CLAUDE.md accurately reflects current tooling (Vitest, oxlint, tsgo)
- [ ] README is trimmed to ~100-200 lines with machine-readable doc pointers and docs site links
- [ ] Context7 returns BigAl documentation when queried (dependent on their indexing timeline)
- [ ] Root-level `llms.txt` exists for repo-browsing agents

### Non-Functional Requirements

- [ ] Docs site loads in under 3 seconds
- [ ] Docs site search returns relevant results for common queries ("findOne", "where clause", "join")
- [ ] llms.txt is parseable by standard llms.txt tooling
- [ ] Skill body is under 500 lines per agentskills.io progressive disclosure guidelines
- [ ] All code examples are copy-paste-complete (imports included, types explicit)

### Quality Gates

- [ ] All code examples in docs compile (validate with manual review)
- [ ] No broken links (validate with a link checker)
- [ ] VitePress build passes without warnings
- [ ] Markdown linting passes for all new docs files
- [ ] sRGB fallback values provided for every oklch color

## Dependencies & Prerequisites

- **Phase 0 has no dependencies** — can start immediately as a single PR
- **Phase 1 depends on Phase 0** — CLAUDE.md and README fixes should land first
- **Phase 2 depends on Phase 1** — skill links to docs site URLs
- **Phase 3 depends on Phase 1 + Phase 2** — cutover requires both docs site and skill to be ready
- **Context7 registration** depends on docs site being live (submit via `context7.com/add-library` or `context7.json`)
- **skills.sh publication** requires the skill to pass validation
- **GitHub Pages configuration** requires manual org-level settings — document as a prerequisite, not an automated task

## Risk Analysis & Mitigation

| Risk                                              | Likelihood | Impact | Mitigation                                                                                                                       |
| ------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Content drift between docs site and llms.txt      | Low        | Low    | `vitepress-plugin-llms` auto-generates both files from docs source at build time — drift is impossible                           |
| VitePress major version breaking changes          | Low        | Medium | Pin VitePress version in `docs/package.json`; docs are markdown so migration to another SSG is straightforward                   |
| skills.sh registry unavailable or changes spec    | Low        | Medium | Skill also lives in the BigAl repo under `.agents/skills/`; can be manually installed                                            |
| Context7 does not index BigAl                     | Medium     | Low    | llms.txt provides a fallback for any LLM tool to fetch                                                                           |
| Docs site maintenance burden                      | Medium     | Medium | Content is markdown; VitePress has minimal config. Auto-deploy reduces friction.                                                 |
| Hand-written API reference goes stale             | Medium     | Medium | API surface is small (~15 key exports). Consider a build-time validation script that asserts all documented types/methods exist. |
| oklch colors unsupported in older browsers        | Low        | Low    | Every oklch value has an sRGB hex fallback in CSS                                                                                |
| VitePress deps slow down ORM contributor CI       | N/A        | N/A    | Eliminated: separate `docs/package.json` isolates docs dependencies                                                              |
| Markdownlint conflicts with VitePress frontmatter | Medium     | Low    | Test compatibility early with sample VitePress files                                                                             |

## Documentation Plan

This initiative IS the documentation plan. No additional docs updates needed beyond the deliverables described above.

## References & Research

### Internal References

- Brainstorm: `internal/brainstorms/2026-03-11-llm-discoverability-brainstorm.md` (moved from docs/)
- Existing docs: `docs/relationships.md`, `docs/subqueries-and-joins.md`, `docs/views-and-readonly-repositories.md`
- README: `README.md` (1,437 lines of content to restructure)
- Existing skill pattern: `.agents/skills/enforcing-typescript-standards/SKILL.md`
- Public API: `src/index.ts` (all exports)
- CI workflows: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- Package metadata: `package.json` (keywords, homepage, files field)

### Recommended Skills for Implementation

Install these skills to assist with each phase. They provide specialized guidance and automation for the exact tasks in this plan. Organized by category with phase applicability noted.

#### llms.txt Creation & Maintenance

| Skill         | Install                                 | Phase | Purpose                                                                                                                                         |
| ------------- | --------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-llms` | `npx skills add github/awesome-copilot` | 1     | Bootstrap initial `llms.txt` following llmstxt.org spec. Validate `vitepress-plugin-llms` output or create the root-level copy. (6.9K installs) |
| `update-llms` | `npx skills add github/awesome-copilot` | 1, 3  | Maintains existing `llms.txt` when docs change. Detects structural drift. (6.8K installs)                                                       |

#### VitePress & Static Site

| Skill                   | Install                                                            | Phase | Purpose                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitepress` (antfu)     | `npx skills add antfu/skills`                                      | 1     | Comprehensive VitePress knowledge: config, routing, theming, code blocks, deployment recipes. (4.3K installs)                                 |
| `vitepress` (harlan-zw) | `npx skills add harlan-zw/vue-ecosystem-skills`                    | 1     | Bleeding-edge, version-aware VitePress skill (tracking v1.6.4). Covers theming, sidebar config, syntax highlighting, DocSearch, router hooks. |
| `github-pages-deployer` | `npx skills add hoyoboy0726123/claude-skill-github-pages-deployer` | 1     | End-to-end GitHub Pages deployment: workflow generation, Pages API enablement, Actions monitoring.                                            |

#### Web Design, CSS & Typography

| Skill                   | Install                                              | Phase | Purpose                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-design`       | (already installed via compound-engineering)         | 1     | Official Anthropic skill for distinctive, production-grade interfaces. Typography pairing, CSS variables, dark themes. Bans "AI slop" aesthetics. (277K installs) |
| `impeccable`            | `npx skills add pbakaus/impeccable`                  | 1     | Upgrade to Anthropic's frontend-design skill. 17 commands (`/polish`, `/audit`, `/distill`, `/bolder`). Refined patterns for typography, color, layout, motion.   |
| `css-coder`             | `npx skills add schalkneethling/webdev-agent-skills` | 1     | Modern CSS standards: oklch color functions, logical properties, cascade best practices, accessibility.                                                           |
| `css-tokens`            | `npx skills add schalkneethling/webdev-agent-skills` | 1     | Design system token architecture: spacing scales, typography scales, color tokens as CSS custom properties. Directly relevant to oklch palette definition.        |
| `web-design-guidelines` | `npx skills add vercel-labs/agent-skills`            | 1     | Web Interface Guidelines auditor: 100+ rules for accessibility, performance, UX. Catches contrast ratio issues with dark themes. (22.8K installs)                 |
| `responsive-web-design` | `npx skills add secondsky/claude-skills`             | 1     | Mobile-first responsive design: fluid typography with `clamp()`, Flexbox/Grid, standard breakpoints, 48px touch targets.                                          |
| `semantic-html`         | `npx skills add schalkneethling/webdev-agent-skills` | 1     | Semantic HTML structure: native elements over ARIA, proper document outline. Improves accessibility and SEO.                                                      |

#### Documentation & Technical Writing

| Skill                                 | Install                                       | Phase | Purpose                                                                                                                                                     |
| ------------------------------------- | --------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `writing-documentation-with-diataxis` | `npx skills add sammcj/agentic-coding`        | 1     | Full Diataxis framework with decision compass. Classifies docs into Tutorials, How-to, Reference, Explanation. (142 installs)                               |
| `documentation-writer`                | `npx skills add github/awesome-copilot`       | 1     | Interactive Diataxis-based doc generation with approval gates. Three-step workflow: clarification, structural planning, content generation. (8.1K installs) |
| `technical-writing`                   | `npx skills add supercent-io/skills-template` | 1     | Five document types: tech specs, architecture docs, runbooks, API docs, changelogs. Audience-aware with Mermaid diagram support. (10.6K installs)           |
| `api-documentation`                   | `npx skills add supercent-io/skills-template` | 1     | Structured approach to documenting methods, parameters, return types, error cases. Maps well to ORM API reference pages. (10.6K installs)                   |

#### README & Content

| Skill                        | Install                                   | Phase | Purpose                                                                                                                      |
| ---------------------------- | ----------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `create-readme`              | `npx skills add github/awesome-copilot`   | 3     | Generates well-structured READMEs from project analysis. GitHub Flavored Markdown with admonition syntax. (7.2K installs)    |
| `crafting-effective-readmes` | `npx skills add softaworks/agent-toolkit` | 3     | Task-specific README for Open Source projects. Interactive Q&A about audience, quick-start path, highlights. (3.4K installs) |

#### SEO & LLM Discoverability

| Skill                     | Install                                             | Phase | Purpose                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta-tags-optimizer`     | `npx skills add aaron-he-zhu/seo-geo-claude-skills` | 1, 3  | Creates titles, descriptions, OpenGraph tags for social previews and search.                                                                                                    |
| `schema-markup-generator` | `npx skills add aaron-he-zhu/seo-geo-claude-skills` | 1     | JSON-LD structured data for rich results. Supports `SoftwareSourceCode` schema type.                                                                                            |
| `geo-content-optimizer`   | `npx skills add aaron-he-zhu/seo-geo-claude-skills` | 1     | Makes content quotable and citable by AI systems (Generative Engine Optimization).                                                                                              |
| `ai-seo`                  | `npx skills add coreyhaines31/marketingskills`      | 1, 3  | Optimization for AI search engines (AEO, GEO). Makes BigAl appear in ChatGPT/Claude/Perplexity responses.                                                                       |
| `copywriting`             | `npx skills add coreyhaines31/marketingskills`      | 1, 3  | Marketing page copy: landing pages, taglines, feature descriptions.                                                                                                             |
| `competitor-alternatives` | `npx skills add coreyhaines31/marketingskills`      | 1     | Generates "BigAl vs X" comparison pages for SEO and developer decision-making.                                                                                                  |
| `seo-aeo-best-practices`  | `npx skills add sanity-io/seo-aeo-best-practices`   | 1     | Answer Engine Optimization patterns. Makes content structured so AI systems cite it in responses.                                                                               |
| `claude-seo`              | See repo for install                                | 1, 3  | 13 sub-skills: schema markup, Core Web Vitals, AI search optimization, E-E-A-T scoring, competitor pages. [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) |

#### AI Discoverability & Marketing

| Skill                       | Install                                         | Phase | Purpose                                                                                                                                                                                          |
| --------------------------- | ----------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AI Discoverability Audit    | See repo for install                            | 3     | Directly checks how visible BigAl is when people ask LLMs about TypeScript ORMs. [BrianRWagner/ai-marketing-claude-code-skills](https://github.com/BrianRWagner/ai-marketing-claude-code-skills) |
| `product-marketing-context` | `npx skills add coreyhaines31/marketingskills`  | All   | Foundation skill: defines positioning, audience, and differentiation. All other marketing skills reference it.                                                                                   |
| `content-repurposing`       | `npx skills add OpenClaudia/openclaudia-skills` | 3     | Turn docs into tweets, posts, and social content across platforms.                                                                                                                               |
| `social-content`            | `npx skills add coreyhaines31/marketingskills`  | 3     | LinkedIn, Twitter, Reddit content creation for launch and ongoing promotion.                                                                                                                     |

#### Agent Skill Creation & Validation

| Skill                 | Install                                          | Phase | Purpose                                                                                           |
| --------------------- | ------------------------------------------------ | ----- | ------------------------------------------------------------------------------------------------- |
| `skill-creator`       | (already installed via compound-engineering)     | 2     | Anthropic's official skill for creating, editing, and evaluating skills. Includes eval workflows. |
| `create-agent-skill`  | (already installed via compound-engineering)     | 2     | Expert guidance on skill structure and best practices.                                            |
| `make-skill-template` | `npx skills add github/awesome-copilot`          | 2     | Scaffolds skill directories with proper frontmatter and structure.                                |
| `create-agentsmd`     | `npx skills add github/awesome-copilot`          | 2     | Creates AGENTS.md following the agents.md spec. Complementary discovery channel.                  |
| `skill-lint-action`   | GitHub Action: `effectorHQ/skill-lint-action@v1` | 2     | CI validation of SKILL.md files against the OpenClaw spec. Adds inline PR annotations.            |

#### CI/CD & Deployment

| Skill                                         | Install                                 | Phase | Purpose                                                                         |
| --------------------------------------------- | --------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| `create-github-action-workflow-specification` | `npx skills add github/awesome-copilot` | 1     | Creates formal specs for GitHub Actions workflows with execution flow diagrams. |
| `conventional-commit`                         | `npx skills add github/awesome-copilot` | All   | Standardized conventional commit messages. Enables automated releases.          |

#### Context7 Submission

No dedicated skill exists for Context7 submission. Use the **web submission** approach:

1. **After docs site is live**, go to `context7.com/add-library`
2. Paste the GitHub URL: `https://github.com/bigalorm/bigal`
3. Optionally add a `context7.json` to the repo root for fine-grained control:

   ```json
   {
     "projectTitle": "BigAl",
     "description": "Type-safe PostgreSQL ORM for Node.js/TypeScript with fluent query builder, decorator-based models, and immutable query state.",
     "folders": ["docs/", "src/", "README.md"],
     "excludeFolders": ["internal/", "tests/", "node_modules/"],
     "excludeFiles": ["*.test.ts", "*.spec.ts"]
   }
   ```

4. Claim ownership via the admin panel (add verification key to `context7.json`)
5. Verify indexing with Context7 MCP: `resolve-library-id` then `query-docs`

**Current status:** BigAl is NOT indexed on Context7 (verified 2026-03-11).

#### Verification & Validation Tools

| Tool                                                                            | Purpose                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `firecrawl/llmstxt-generator` (519 GitHub stars)                                | Generates llms.txt from existing websites. Validate `vitepress-plugin-llms` output after docs site is live.              |
| Context7 MCP (`resolve-library-id`, `query-docs`)                               | Already available in this environment. Verify BigAl appears in Context7 after submission.                                |
| `superlight-context7-skill` (`npx skills add edxeth/superlight-context7-skill`) | Token-efficient Context7 doc fetching via REST API (~63 tokens vs ~1,700 for MCP). Useful for verifying indexed content. |

#### Skill Registries for Further Discovery

| Registry                       | URL                                                               |
| ------------------------------ | ----------------------------------------------------------------- |
| skills.sh                      | <https://skills.sh>                                               |
| github/awesome-copilot         | <https://github.com/github/awesome-copilot> (222 skills)          |
| VoltAgent/awesome-agent-skills | <https://github.com/VoltAgent/awesome-agent-skills> (549+ skills) |
| SkillsMP                       | <https://skillsmp.com> (400K+ skills)                             |
| SkillHub                       | <https://www.skillhub.club> (7K+ skills)                          |

### External References

- agentskills.io specification: <https://agentskills.io/specification>
- agents.md specification: <https://agents.md/>
- Vercel skills conventions: <https://github.com/vercel-labs/skills>
- llmstxt.org specification: <https://llmstxt.org/>
- VitePress documentation: <https://vitepress.dev/>
- GitHub Pages deployment: <https://docs.github.com/en/pages>
- Context7 adding libraries: <https://context7.com/add-library>
- vitepress-plugin-llms: <https://github.com/okineadev/vitepress-plugin-llms>
- Diataxis documentation framework: <https://diataxis.fr/>
- impeccable.style (frontend design skill): <https://impeccable.style/>

### Deepening Agent Findings (Key Insights)

- **TypeScript reviewer:** tsgo is incompatible with TypeDoc's compiler API. Use `.mjs` for build scripts. Create separate `docs/package.json`. Verify oxlint can parse VitePress imports.
- **Architecture strategist:** Move brainstorms/plans out of `docs/`. Gitignore generated files. Derive llms-full.txt ordering from VitePress sidebar config. Adopt "skill links to docs, never duplicates" content strategy.
- **Agent-native reviewers (2):** Verify `.agents/` in npm package. SQL-to-BigAl translation table is highest-leverage artifact. Add structured TOC to llms-full.txt. Add root-level `llms.txt`. Add "Machine-Readable Documentation" section to README. Add `robots.txt` and `<link rel="llms-txt">` meta tag. Error message catalog in skill is high-value. Raise llms-full.txt to 5,000 lines.
- **Skills expert:** Rename to `using-bigal` (gerund). Add required Quick Start and Success Criteria. Drop non-spec frontmatter fields. Remove triggers from body (belongs in description). Use consistent terminology.
- **Simplicity reviewer:** Challenged 15+ pages (consolidated to ~12). Challenged custom theme (kept per user's explicit design preference). Challenged custom generation script (replaced by `vitepress-plugin-llms`). Challenged reference files (eliminated).
- **Frontend design:** Comprehensive oklch palette with sRGB fallbacks. DM Sans/Source Sans 3/JetBrains Mono typography. Separate SQL syntax tokens. Noise texture overlay. Code blocks as recessed dark wells with accent glow.
- **Performance oracle:** Build under 20s, search instant for 15 pages, oklch rendering negligible. Add `cache: 'npm'` and concurrency group to CI. sRGB fallbacks for browser compat.
