export type MockState = "loading" | "empty" | "error" | "offline" | "default";

function getMockState(): MockState {
  const params = new URLSearchParams(window.location.search);
  const val = params.get("mock");
  if (val === "loading" || val === "empty" || val === "error" || val === "offline") return val;
  return "default";
}

const LATENCY = 600;

export async function mockFetch<T>(
  loader: () => Promise<T>,
  emptyValue: T
): Promise<T> {
  await new Promise<void>((r) => setTimeout(r, LATENCY));

  const state = getMockState();

  // Promise<never> tells TS this path diverges — no dead code after
  if (state === "loading") await new Promise<never>(() => {});
  if (state === "empty") return emptyValue;
  if (state === "error") throw new Error("mock_error");
  if (state === "offline") throw new Error("mock_offline");

  return loader();
}

// Fixture loaders — each module imports the fixture it needs
export async function loadFixture<T>(moduleName: string): Promise<T> {
  const modules = import.meta.glob<{ default: T }>("./fixtures/*.fixtures.json");
  const key = Object.keys(modules).find((k) => k.includes(`/${moduleName}.fixtures.json`));
  if (!key) throw new Error(`Fixture not found: ${moduleName}`);
  const mod = await modules[key]();
  return mod.default;
}
