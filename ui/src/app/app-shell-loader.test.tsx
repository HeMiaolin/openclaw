/**
 * A shell module download can fail while the document itself is still reachable.
 * That failure must join the shared guarded recovery instead of waiting for a click.
 */
import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, expect, it, vi } from "vitest";
import type { ApplicationRuntime } from "../runtime/application-runtime.ts";

const scheduleStaleChunkReload = vi.hoisted(() => vi.fn(async () => true));

vi.mock("./stale-chunk-reload.ts", async () => {
  const actual =
    await vi.importActual<typeof import("./stale-chunk-reload.ts")>("./stale-chunk-reload.ts");
  return { ...actual, scheduleStaleChunkReload };
});

// The lazy shell import resolves, then fails the way a stale module response does.
vi.mock("./app-host.tsx", () => ({
  OpenClawShell: () => {
    throw new Error("Failed to fetch dynamically imported module: /src/app/app-host.tsx");
  },
}));

const { ShellLoader } = await import("./app-shell-loader.tsx");

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

it("starts the guarded shell recovery without a manual retry", async () => {
  scheduleStaleChunkReload.mockClear();

  render(() => <ShellLoader runtime={{} as ApplicationRuntime} fallback={<span />} />);

  await expect.poll(() => scheduleStaleChunkReload.mock.calls.length).toBeGreaterThan(0);
  expect(scheduleStaleChunkReload).toHaveBeenCalledWith({ canReload: expect.any(Function) });
});
