import type {Instrument} from './universe-model';
export type PackedMarketCatalogue = {
  schemaVersion: 1;
  revision: string;
  generatedAt: string;
  columns: string[];
  dictionaries: Record<string, string[]>;
  sources: Record<string, {retrievedAt: string; asof?: string}>;
  rows: unknown[][];
};
/** Decode the optional compact transport. Callers own loading/OCI URL resolution. */
export function decodeMarketCatalogue(value: PackedMarketCatalogue): Instrument[] {
  if(value.schemaVersion!==1 || !Array.isArray(value.rows)) throw new Error('Unsupported market catalogue');
  return value.rows.map(row=>{
    const asset: Record<string, unknown> = {};
    value.columns.forEach((column,i)=>{
      let v=row[i];
      if(v!==null&&v!==undefined){
        if(value.dictionaries[column]) v=value.dictionaries[column][Number(v)];
        if(v!==undefined) asset[column]=v;
      }
    });
    if(typeof asset.assetId!=='string'||typeof asset.ticker!=='string'||typeof asset.name!=='string') throw new Error('Invalid market listing identity');
    if(asset.mic){asset.exchange??=asset.mic;asset.localSymbol??=asset.ticker;asset.listingId??=asset.assetId;}
    asset.source??=asset.metadataSourceId;
    const source=value.sources[String(asset.metadataSourceId)];
    if(source)asset.metadataRetrievedAt=source.retrievedAt;
    return asset as Instrument;
  });
}
