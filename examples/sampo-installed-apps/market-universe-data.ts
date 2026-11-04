import packedUrl from "../../assets/market-universe/catalog.compact.json?url&no-inline";
import groupsUrl from "../../assets/market-universe/groups.json?url&no-inline";
import configuredNavigation from "../../assets/market-universe/navigation.json";
import artwork from "../../assets/market-universe/artwork.json";
import fixture from "./coverage-fixture.json";
import {decodeMarketCatalogue, type PackedMarketCatalogue} from "../../packages/vfo-workspace-core/src/market/market-catalogue";
import type {Instrument,MarketGroup,MarketNavigation,CoverageSnapshot} from "../../packages/vfo-workspace-core/src/market/universe-model";
// Static package assets, loaded once before the module's existing array exports
// become available. They are independent of every market-data/coverage reader.
async function packageJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Static market directory asset could not be loaded (${response.status}).`);
  return response.json() as Promise<T>;
}
const [packed, configuredGroups] = await Promise.all([
  packageJson<PackedMarketCatalogue>(packedUrl),
  packageJson<{revision:string;groups:MarketGroup[]}>(groupsUrl),
]);
// Only a small manifest of emitted local URLs enters JS. SVG bodies are separate
// assets and requested by visible/page images; no website requests or tracking.
const imageAssets = import.meta.glob("../../assets/market-universe/logos/*.svg", {
  query: "?url&no-inline", import: "default", eager: true,
}) as Record<string,string>;
const logos = new Map(Object.entries(imageAssets).map(([path,url])=>[path.split('/').at(-1),url]));
export const navigation = configuredNavigation as MarketNavigation;
const files=artwork.files as Record<string,{role:string;authentic:boolean}>;
export const marketAssets: Instrument[] = decodeMarketCatalogue(packed as PackedMarketCatalogue).map(a=>{
  const file=(a as Instrument & {logoFile?:string}).logoFile;
  const override=(artwork.overrides as Record<string,{role:string;label:string}>)[a.assetId];
  return {...a,logo:file?logos.get(file):undefined,logoRole:override?.role??a.logoRole??(file?files[file]?.role:undefined),
    logoLabel:override?.label??a.logoLabel??(file&&files[file]?.role==='fund-sponsor-artwork'?'Fund sponsor logo':file?'Issuer / instrument artwork':'Generated monogram')};
});
export const marketGroups = configuredGroups.groups as MarketGroup[];
export const catalogueRevision = packed.revision;
export const catalogueAsOf = packed.generatedAt.slice(0,10);
export const demoCoverage = fixture as CoverageSnapshot;
export const historyWindow = { start: "2026-08-03", end: "2026-11-02" };
