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
# Fetch source for a package (auto-detects version from package.json)
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

## How it works

1. Queries the npm registry to find the package's repository URL
2. Detects the installed version from your `package.json` or lockfile
3. Clones the repository at the matching git tag
4. Stores the source in `opensrc/<package-name>/`
5. Automatically adds `opensrc/` to your `.gitignore`

## Output

After running `opensrc zod`:

```
opensrc/
└── zod/
    ├── src/
    ├── package.json
    └── ...
```

Your AI coding agent can then read `opensrc/zod/src/` to understand internals.

## License

Apache-2.0

