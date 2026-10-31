import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import { listSessionWorkspaceFiles } from "./workspace-files.js";

const SAVED_PATH = "notes/ΕΛΕΓΧΟΣ/README.md";

let root: string | undefined;

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
  }
  root = undefined;
});

async function workspaceWithSavedReport(): Promise<string> {
  root = await mkdtemp(path.join(tmpdir(), "openclaw-workspace-search-"));
  const directory = path.join(root, "notes", "ΕΛΕΓΧΟΣ");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "README.md"), "# report\n");
  return root;
}

it("finds a saved path for every Greek sigma form", async () => {
  const workspaceRoot = await workspaceWithSavedReport();

  for (const search of ["Σ", "σ", "ς", "ΕΛΕΓΧΟΣ"]) {
    const result = await listSessionWorkspaceFiles({
      root: workspaceRoot,
      fileRoot: workspaceRoot,
      files: [],
      search,
      assertCurrent: () => {},
    });

    expect(
      result?.browser?.entries.some((entry) => entry.path === SAVED_PATH),
      `search ${search} should find ${SAVED_PATH}`,
    ).toBe(true);
  }
});
