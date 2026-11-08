# Contributing

The most useful contribution is running the skill on a stack you know well and fixing what it got wrong.

## Report a problem

Open an issue with your stack and versions, what you asked, what the agent did, and what it should have done. Please remove anything private from logs and screenshots.

## Improve an adapter

Adapters live in `skills/kitchen-sink/references/stacks/`. Before opening a pull request:

1. Run the advice on a real project, and on screen where states are involved. Compiling isn't enough, because a forcing technique can compile and change nothing.
2. Say in the pull request what you ran and on which versions.
3. If you've fully run an adapter, update the testing table in the README.

## Add an adapter

1. Copy the shape of an existing adapter. Cover these points, and leave out anything that doesn't apply:
   - **Tokens:** what they become in this stack, and how each styling option or library changes that.
   - **Where the sink lives and how it's gated:** exact paths and code, kept out of release builds where possible.
   - **Forcing states:** what really works, and when to use `live`.
   - **Controls:** theme, direction, and text scale.
   - **Presentation:** the layout grid, framed group, press or hover feedback and decorative colour, with a fallback or `na: <reason>` where a pattern doesn't fit.
   - **Verify:** the commands to run and how to see the result.
   - **Pitfalls:** what you only learn by getting it wrong.
2. Add detection rules to `scripts/detect-stack.mjs`, and add a case to `CASES` in `tests/run.mjs`.
3. Add the stack to the table in `references/unknown-stack.md` and to the README.

Keep adapters short and focused on what an expert would otherwise have to tell the agent. Explain why when it isn't obvious. Avoid pinning version numbers. Describe differences by version, and tell the reader to check the installed one.

## Change the catalog or scripts

- Catalog changes go in `assets/component-catalog.json`. A new required state or component affects every project's verification, so explain why it's worth it.
- Scripts use only Node's standard library, so that they run anywhere with no install.
- Scripts only read the project and write where they're told. Keep it that way.
- Run the tests:

```bash
node tests/run.mjs
```

## Check that the skill still works

`skills/kitchen-sink/evals/` holds realistic prompts with their expected results. If you change the workflow, run them with Claude Code. These are real, billed model runs:

```bash
claude plugin eval skills/kitchen-sink --allow-tools Write,Edit,Bash --scaffold
```

## What belongs here

Keep the skill about building kitchen sinks. Generated sinks must contain nothing that surprises the person who asked for them: no analytics, no network calls, and no dependencies added without asking.

## Branches and releases

Open pull requests against `dev`. When CI passes on `dev`, a workflow opens a pull request from `dev` to `main`. When that is merged and CI passes on `main`, a draft release is created for the version in `SKILL.md`, with its notes taken from the matching `CHANGELOG.md` section. A maintainer publishes the draft by hand. To release, bump `metadata.version` in `SKILL.md` and add a `## <version>` section to `CHANGELOG.md` in the same change.

`main` and `dev` only change through pull requests that pass CI, and release tags can only be created by the maintainer. Workflows on pull requests from forks wait for maintainer approval. To report a security issue, see [SECURITY.md](SECURITY.md).
