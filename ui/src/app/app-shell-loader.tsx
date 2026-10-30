import type { JSX as SolidJSX } from "@solidjs/web";
import { Errored, Loading, Show, lazy, onSettled } from "solid-js";
import { LazyViewError } from "../components/solid/lazy-view-error.tsx";
import type { OpenClawShellProps } from "./app-host.tsx";
import {
  isStaleChunkImportError,
  retryStaleChunkReloadWhenReachable,
  scheduleStaleChunkReload,
} from "./stale-chunk-reload.ts";

const LazyShell = lazy(() => import("./app-host.tsx"), { export: "OpenClawShell" });

type ShellLoaderProps = OpenClawShellProps & { fallback: SolidJSX.Element };

/** Sign-in and standalone documents never acquire the workspace shell's graph. */
export function ShellLoader(props: ShellLoaderProps): SolidJSX.Element {
  return (
    <Errored fallback={(error, reset) => <ShellLoadError error={error()} reset={reset} />}>
      <Loading fallback={props.fallback}>
        <LazyShell
          runtime={props.runtime}
          getReadiness={props.getReadiness}
          onboarding={props.onboarding}
          onShell={props.onShell}
        />
      </Loading>
    </Errored>
  );
}

function ShellLoadError(props: { error: unknown; reset: () => void }): SolidJSX.Element {
  let active = true;
  onSettled(() => () => {
    active = false;
  });
  const stale = () => isStaleChunkImportError(props.error);
  const retry = async () => {
    const reloading =
      stale() && (await retryStaleChunkReloadWhenReachable({ canReload: () => active }));
    if (active && !reloading) {
      props.reset();
    }
  };
  return (
    <openclaw-route-fragment style={{ display: "contents" }}>
      <Show when={stale()}>
        {() => {
          // A recognized shell-download failure joins the shared guarded recovery instead of
          // waiting for a manual Reload; reachability, loop bounds and draft protection stay
          // owned by that path, so a failed attempt still lands on this error surface.
          onSettled(() => {
            void scheduleStaleChunkReload({ canReload: () => active });
          });
          return <></>;
        }}
      </Show>
      <LazyViewError
        error={props.error}
        stale={stale()}
        onRetry={() => {
          void retry();
        }}
      />
    </openclaw-route-fragment>
  );
}
