import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, rm, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import {
  getOpensrcDir,
  getPackagesDir,
  getReposDir,
  getPackagePath,
  getPackageRelativePath,
  getRepoPath,
  getRepoRelativePath,
  packageExists,
  repoExists,
  getPackageInfo,
  getRepoInfo,
  listSources,
  removePackageSource,
  removeRepoSource,
} from "./git.js";

const TEST_DIR = join(process.cwd(), ".test-git");
const OPENSRC_DIR = join(TEST_DIR, "opensrc");

beforeEach(async () => {
  await mkdir(OPENSRC_DIR, { recursive: true });
});

afterEach(async () => {
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true, force: true });
  }
});

describe("path helpers", () => {
  describe("getOpensrcDir", () => {
    it("returns opensrc directory path", () => {
      expect(getOpensrcDir("/project")).toBe("/project/opensrc");
    });

    it("uses cwd by default", () => {
      expect(getOpensrcDir()).toBe(join(process.cwd(), "opensrc"));
    });
  });

  describe("getPackagesDir", () => {
    it("returns packages directory without ecosystem", () => {
      expect(getPackagesDir("/project")).toBe("/project/opensrc/packages");
    });

    it("returns ecosystem-specific directory", () => {
      expect(getPackagesDir("/project", "npm")).toBe("/project/opensrc/packages/npm");
      expect(getPackagesDir("/project", "pypi")).toBe("/project/opensrc/packages/pypi");
      expect(getPackagesDir("/project", "crates")).toBe("/project/opensrc/packages/crates");
    });
  });

  describe("getReposDir", () => {
    it("returns repos directory path", () => {
      expect(getReposDir("/project")).toBe("/project/opensrc/repos");
    });
  });

  describe("getPackagePath", () => {
    it("returns full path for npm package", () => {
      expect(getPackagePath("zod", "/project", "npm")).toBe(
        "/project/opensrc/packages/npm/zod",
      );
    });

    it("returns full path for pypi package", () => {
      expect(getPackagePath("requests", "/project", "pypi")).toBe(
        "/project/opensrc/packages/pypi/requests",
      );
    });

    it("returns full path for crates package", () => {
      expect(getPackagePath("serde", "/project", "crates")).toBe(
        "/project/opensrc/packages/crates/serde",
      );
    });

    it("handles scoped npm packages", () => {
      expect(getPackagePath("@babel/core", "/project", "npm")).toBe(
        "/project/opensrc/packages/npm/@babel/core",
      );
    });

    it("defaults to npm ecosystem", () => {
      expect(getPackagePath("zod", "/project")).toBe(
        "/project/opensrc/packages/npm/zod",
      );
    });
  });

  describe("getPackageRelativePath", () => {
    it("returns relative path for npm package", () => {
      expect(getPackageRelativePath("zod", "npm")).toBe("packages/npm/zod");
    });

    it("returns relative path for pypi package", () => {
      expect(getPackageRelativePath("requests", "pypi")).toBe("packages/pypi/requests");
    });

    it("returns relative path for scoped package", () => {
      expect(getPackageRelativePath("@babel/core", "npm")).toBe("packages/npm/@babel/core");
    });

    it("defaults to npm ecosystem", () => {
      expect(getPackageRelativePath("zod")).toBe("packages/npm/zod");
    });
  });

  describe("getRepoPath", () => {
    it("returns full path for repo", () => {
      expect(getRepoPath("github.com/vercel/ai", "/project")).toBe(
        "/project/opensrc/repos/github.com/vercel/ai",
      );
    });

    it("handles different hosts", () => {
      expect(getRepoPath("gitlab.com/owner/repo", "/project")).toBe(
        "/project/opensrc/repos/gitlab.com/owner/repo",
      );
    });
  });

  describe("getRepoRelativePath", () => {
    it("returns relative path for repo", () => {
      expect(getRepoRelativePath("github.com/vercel/ai")).toBe(
        "repos/github.com/vercel/ai",
      );
    });
  });
});

describe("existence checks", () => {
  describe("packageExists", () => {
    it("returns false if package does not exist", () => {
      expect(packageExists("zod", TEST_DIR, "npm")).toBe(false);
    });

    it("returns true if package exists", async () => {
      const packageDir = join(OPENSRC_DIR, "packages", "npm", "zod");
      await mkdir(packageDir, { recursive: true });

      expect(packageExists("zod", TEST_DIR, "npm")).toBe(true);
    });

    it("checks correct ecosystem", async () => {
      const npmDir = join(OPENSRC_DIR, "packages", "npm", "pkg");
      await mkdir(npmDir, { recursive: true });

      expect(packageExists("pkg", TEST_DIR, "npm")).toBe(true);
      expect(packageExists("pkg", TEST_DIR, "pypi")).toBe(false);
    });
  });

  describe("repoExists", () => {
    it("returns false if repo does not exist", () => {
      expect(repoExists("github.com/vercel/ai", TEST_DIR)).toBe(false);
    });

    it("returns true if repo exists", async () => {
      const repoDir = join(OPENSRC_DIR, "repos", "github.com", "vercel", "ai");
      await mkdir(repoDir, { recursive: true });

      expect(repoExists("github.com/vercel/ai", TEST_DIR)).toBe(true);
    });
  });
});

describe("sources.json reading", () => {
  describe("getPackageInfo", () => {
    it("returns null if sources.json does not exist", async () => {
      expect(await getPackageInfo("zod", TEST_DIR, "npm")).toBeNull();
    });

    it("returns null if package not in sources.json", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({ packages: { npm: [] } }),
      );

      expect(await getPackageInfo("zod", TEST_DIR, "npm")).toBeNull();
    });

    it("returns package info if found", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({
          packages: {
            npm: [{ name: "zod", version: "3.22.0", path: "packages/npm/zod", fetchedAt: "2024-01-01" }],
          },
        }),
      );

      const info = await getPackageInfo("zod", TEST_DIR, "npm");
      expect(info).toEqual({
        name: "zod",
        version: "3.22.0",
        path: "packages/npm/zod",
        fetchedAt: "2024-01-01",
      });
    });

    it("returns null for wrong ecosystem", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({
          packages: {
            npm: [{ name: "zod", version: "3.22.0", path: "packages/npm/zod", fetchedAt: "2024-01-01" }],
          },
        }),
      );

      expect(await getPackageInfo("zod", TEST_DIR, "pypi")).toBeNull();
    });
  });

  describe("getRepoInfo", () => {
    it("returns null if sources.json does not exist", async () => {
      expect(await getRepoInfo("github.com/vercel/ai", TEST_DIR)).toBeNull();
    });

    it("returns null if repo not in sources.json", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({ repos: [] }),
      );

      expect(await getRepoInfo("github.com/vercel/ai", TEST_DIR)).toBeNull();
    });

    it("returns repo info if found", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({
          repos: [{ name: "github.com/vercel/ai", version: "main", path: "repos/github.com/vercel/ai", fetchedAt: "2024-01-01" }],
        }),
      );

      const info = await getRepoInfo("github.com/vercel/ai", TEST_DIR);
      expect(info).toEqual({
        name: "github.com/vercel/ai",
        version: "main",
        path: "repos/github.com/vercel/ai",
        fetchedAt: "2024-01-01",
      });
    });
  });

  describe("listSources", () => {
    it("returns empty if sources.json does not exist", async () => {
      const sources = await listSources(TEST_DIR);
      expect(sources).toEqual({
        packages: { npm: [], pypi: [], crates: [] },
        repos: [],
      });
    });

    it("returns sources from sources.json", async () => {
      await writeFile(
        join(OPENSRC_DIR, "sources.json"),
        JSON.stringify({
          packages: {
            npm: [{ name: "zod", version: "3.22.0", path: "packages/npm/zod", fetchedAt: "2024-01-01" }],
            pypi: [{ name: "requests", version: "2.31.0", path: "packages/pypi/requests", fetchedAt: "2024-01-01" }],
          },
          repos: [{ name: "github.com/vercel/ai", version: "main", path: "repos/github.com/vercel/ai", fetchedAt: "2024-01-01" }],
        }),
      );

      const sources = await listSources(TEST_DIR);

      expect(sources.packages.npm).toHaveLength(1);
      expect(sources.packages.npm[0].ecosystem).toBe("npm");
      expect(sources.packages.pypi).toHaveLength(1);
      expect(sources.packages.pypi[0].ecosystem).toBe("pypi");
      expect(sources.packages.crates).toHaveLength(0);
      expect(sources.repos).toHaveLength(1);
    });
  });
});

describe("removal functions", () => {
  describe("removePackageSource", () => {
    it("returns false if package does not exist", async () => {
      const result = await removePackageSource("zod", TEST_DIR, "npm");
      expect(result).toBe(false);
    });

    it("removes package directory", async () => {
      const packageDir = join(OPENSRC_DIR, "packages", "npm", "zod");
      await mkdir(packageDir, { recursive: true });
      await writeFile(join(packageDir, "package.json"), "{}");

      const result = await removePackageSource("zod", TEST_DIR, "npm");
      expect(result).toBe(true);
      expect(existsSync(packageDir)).toBe(false);
    });

    it("cleans up empty scope directory", async () => {
      const scopeDir = join(OPENSRC_DIR, "packages", "npm", "@scope");
      const packageDir = join(scopeDir, "pkg");
      await mkdir(packageDir, { recursive: true });
      await writeFile(join(packageDir, "package.json"), "{}");

      await removePackageSource("@scope/pkg", TEST_DIR, "npm");

      expect(existsSync(packageDir)).toBe(false);
      expect(existsSync(scopeDir)).toBe(false);
    });

    it("does not remove scope directory if other packages exist", async () => {
      const scopeDir = join(OPENSRC_DIR, "packages", "npm", "@scope");
      const pkg1Dir = join(scopeDir, "pkg1");
      const pkg2Dir = join(scopeDir, "pkg2");
      await mkdir(pkg1Dir, { recursive: true });
      await mkdir(pkg2Dir, { recursive: true });

      await removePackageSource("@scope/pkg1", TEST_DIR, "npm");

      expect(existsSync(pkg1Dir)).toBe(false);
      expect(existsSync(scopeDir)).toBe(true);
      expect(existsSync(pkg2Dir)).toBe(true);
    });
  });

  describe("removeRepoSource", () => {
    it("returns false if repo does not exist", async () => {
      const result = await removeRepoSource("github.com/vercel/ai", TEST_DIR);
      expect(result).toBe(false);
    });

    it("removes repo directory", async () => {
      const repoDir = join(OPENSRC_DIR, "repos", "github.com", "vercel", "ai");
      await mkdir(repoDir, { recursive: true });
      await writeFile(join(repoDir, "README.md"), "# AI");

      const result = await removeRepoSource("github.com/vercel/ai", TEST_DIR);
      expect(result).toBe(true);
      expect(existsSync(repoDir)).toBe(false);
    });

    it("cleans up empty owner and host directories", async () => {
      const repoDir = join(OPENSRC_DIR, "repos", "github.com", "vercel", "ai");
      await mkdir(repoDir, { recursive: true });

      await removeRepoSource("github.com/vercel/ai", TEST_DIR);

      expect(existsSync(join(OPENSRC_DIR, "repos", "github.com", "vercel"))).toBe(false);
      expect(existsSync(join(OPENSRC_DIR, "repos", "github.com"))).toBe(false);
    });

    it("does not remove owner dir if other repos exist", async () => {
      const repo1Dir = join(OPENSRC_DIR, "repos", "github.com", "vercel", "ai");
      const repo2Dir = join(OPENSRC_DIR, "repos", "github.com", "vercel", "next.js");
      await mkdir(repo1Dir, { recursive: true });
      await mkdir(repo2Dir, { recursive: true });

      await removeRepoSource("github.com/vercel/ai", TEST_DIR);

      expect(existsSync(repo1Dir)).toBe(false);
      expect(existsSync(join(OPENSRC_DIR, "repos", "github.com", "vercel"))).toBe(true);
    });
  });
});

