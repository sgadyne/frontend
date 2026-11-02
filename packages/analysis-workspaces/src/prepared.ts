import type {JsonValue, PreparedDataProvider, PublicationReference} from '@sampo/contracts';
import {object} from './contracts.ts';

const canonical = (v: unknown): string => JSON.stringify(v, (_key, value) => object(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value);
const abort = (signal: AbortSignal) => {if (signal.aborted) throw new DOMException('Read superseded.', 'AbortError');};

export interface ExactValue {value: unknown; reference: PublicationReference; partial: boolean;}

export async function readPrepared(provider: PreparedDataProvider, bindingId: string,
  partition: Record<string, JsonValue>, signal: AbortSignal): Promise<ExactValue | null> {
  const request = {bindingId, partition};
  let leaseId: string | undefined;
  try {
    abort(signal);
    const resolution = await provider.resolve(request, {signal});
    abort(signal);
    const reference = resolution.reference;
    if (!reference) return null;
    if (canonical(reference.partition) !== canonical(partition)) throw new Error('The provider resolved a different selection.');
    const response = await provider.read({...request, revision: reference.revision}, {signal});
    leaseId = response.leaseId;
    abort(signal);
    if (response.result.status === 'unavailable') return null;
    if (response.result.status === 'error') throw new Error('The cached result could not be read.');
    if (!response.reference || canonical(response.reference) !== canonical(reference)) throw new Error('The provider did not return the exact selected publication.');
    if (response.result.provenance.synthetic !== false) throw new Error('The installed binding has not identified real cached data.');
    const data = response.result.data;
    if (!object(data) || data.encoding !== 'sampo.lossless-json.v1' || !('value' in data)) throw new Error('Unsupported prepared-data encoding.');
    return {value: data.value, reference, partial: response.result.status === 'partial' || response.result.completeness !== 'complete'};
  } finally {
    if (leaseId) await provider.release({...request, leaseId}).catch(() => undefined);
  }
}
