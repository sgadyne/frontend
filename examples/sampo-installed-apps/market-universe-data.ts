import catalog from "../../assets/market-universe/catalog.json";
import configuredGroups from "../../assets/market-universe/groups.json";
import configuredNavigation from "../../assets/market-universe/navigation.json";
import fixture from "./coverage-fixture.json";
import type {
  Instrument,
  MarketGroup,
  MarketNavigation,
  CoverageSnapshot,
} from "../../packages/vfo-workspace-core/src/market/universe-model";
// Vite embeds only existing repository SVG assets; no remote logo requests.
const svgAssets = import.meta.glob("../../assets/market-universe/logos/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const logos = new Map(
  Object.entries(svgAssets).map(([path, svg]) => [
    path.split("/").at(-1),
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg),
  ]),
);
export const navigation = configuredNavigation as MarketNavigation;
const shortcutFunds = new Set(
  navigation.regions.flatMap((r) => r.etfs.map((e) => e.assetId)),
);
export const marketAssets: Instrument[] = catalog.assets.map((a) => ({
  ...a,
  instrumentType: shortcutFunds.has(a.assetId) ? "ETF" : a.instrumentType,
  logo:
    "logoFile" in a
      ? logos.get(String(a.logoFile).split("/").at(-1))
      : undefined,
}));
export const marketGroups = configuredGroups.groups as MarketGroup[];
export const catalogueRevision = configuredGroups.revision;
export const catalogueAsOf = "2026-10-31";
export const demoCoverage = fixture as CoverageSnapshot;
export const historyWindow = { start: "2026-08-03", end: "2026-11-02" };
