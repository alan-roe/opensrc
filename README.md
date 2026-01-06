# opensrc

Fetch source code for npm packages to give coding agents deeper context than types alone.

## Why?

When working with AI coding agents, types and documentation often aren't enough. Sometimes the agent needs to understand the *implementation* - how something works internally, not just its interface.

`opensrc` automates the process of fetching package source code so your agent can reference it when needed.

## Installation

```bash
npm install -g opensrc
```

Or use with npx:

```bash
npx opensrc <package>
```

## Usage

```bash
# Fetch source for a package (auto-detects version from lockfile)
opensrc zod

# Fetch specific version
opensrc zod@3.22.0

# Fetch multiple packages
opensrc react react-dom next

# List fetched sources
opensrc list

# Remove a source
opensrc remove zod
```

Re-running `opensrc <package>` automatically updates to match your installed version—no flags needed.

## How it works

1. Queries the npm registry to find the package's repository URL
2. Detects the installed version from your lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`)
3. Clones the repository at the matching git tag
4. Stores the source in `opensrc/<package-name>/`
5. Adds `opensrc/` to `.gitignore`
6. Updates `AGENTS.md` to point agents to the source code

## Output

After running `opensrc zod`:

```
opensrc/
├── sources.json        # Index of fetched packages
└── zod/
    ├── src/
    ├── package.json
    └── ...
```

The `sources.json` file lists all fetched packages with their versions, so agents know what's available:

```json
{
  "packages": [
    { "name": "zod", "version": "3.22.0", "path": "opensrc/zod" }
  ]
}
```

## License

Apache-2.0
