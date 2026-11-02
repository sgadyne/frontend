import {useId} from 'react';
import {StatusBadge, type StatusKind} from './StatusComponents';
import './PublicationProvenance.css';

export type PublicationResultState = 'ready' | 'partial' | 'missing' | 'error';
export type PublicationFreshnessState = 'fresh' | 'stale' | 'unknown';

export interface PublicationProvenanceProps {
  /** Namespace or data scope supplied by the owning app. */
  namespace?: string | null;
  /** Prepared source identity supplied by the owning app. */
  source?: string | null;
  /** Exact source-observation timestamp/date; never inferred from publication age. */
  sourceAsOf?: string | null;
  /** Exact ID/revision of the displayed publication. */
  publicationRevision?: string | null;
  /** Age of the publication in seconds, kept separate from sourceAsOf. */
  publicationAgeSeconds?: number | null;
  resultState?: PublicationResultState | null;
  freshnessState?: PublicationFreshnessState | null;
  className?: string;
}

const notSupplied = 'Not supplied';

const resultLabels: Record<PublicationResultState, string> = {
  ready: 'Ready',
  partial: 'Partial',
  missing: 'Missing',
  error: 'Error',
};

const freshnessLabels: Record<PublicationFreshnessState, string> = {
  fresh: 'Fresh',
  stale: 'Stale',
  unknown: 'Unknown',
};

function freshnessStatus(state: PublicationFreshnessState): StatusKind {
  if (state === 'fresh') return 'fresh';
  if (state === 'stale') return 'stale';
  return 'missing';
}

function publicationAge(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value < 0) return notSupplied;
  const seconds = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(value);
  return `${seconds} ${value === 1 ? 'second' : 'seconds'}`;
}

function provided(value: string | null | undefined) {
  return value?.trim() ? value : notSupplied;
}

/** A display-only summary of supplied publication and source timing metadata. */
export default function PublicationProvenance({
  namespace,
  source,
  sourceAsOf,
  publicationRevision,
  publicationAgeSeconds,
  resultState,
  freshnessState,
  className = '',
}: PublicationProvenanceProps) {
  const titleId = useId();
  const classes = ['ui-publication-provenance', className].filter(Boolean).join(' ');

  return <section className={classes} aria-labelledby={titleId}>
    <header className="ui-publication-provenance__header">
      <h2 id={titleId}>Publication provenance</h2>
      <div className="ui-publication-provenance__badges" role="group" aria-label="Publication state">
        {resultState && <StatusBadge status={resultState} label={`Result ${resultLabels[resultState]}`} />}
        {freshnessState && <StatusBadge status={freshnessStatus(freshnessState)} label={`Publication ${freshnessLabels[freshnessState]}`} />}
      </div>
    </header>
    <dl className="ui-publication-provenance__details">
      <div><dt>Namespace</dt><dd>{provided(namespace)}</dd></div>
      <div><dt>Source</dt><dd>{provided(source)}</dd></div>
      <div><dt>Source observation time</dt><dd>{sourceAsOf?.trim()
        ? <time dateTime={sourceAsOf}>{sourceAsOf}</time>
        : notSupplied}</dd></div>
      <div><dt>Publication revision</dt><dd>{provided(publicationRevision)}</dd></div>
      <div><dt>Publication age</dt><dd>{publicationAge(publicationAgeSeconds)}</dd></div>
      <div><dt>Result state</dt><dd>{resultState ? resultLabels[resultState] : notSupplied}</dd></div>
      <div><dt>Publication freshness</dt><dd>{freshnessState ? freshnessLabels[freshnessState] : notSupplied}</dd></div>
    </dl>
  </section>;
}
