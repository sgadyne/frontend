import {useId, type ReactNode} from 'react';
import './StatusComponents.css';

export type StatusKind = 'fresh' | 'ready' | 'stale' | 'partial' | 'loading' | 'empty' | 'missing' | 'unavailable' | 'error';
export type MetricTone = 'neutral' | 'positive' | 'negative' | 'warning';

const statusLabels: Record<StatusKind, string> = {
  fresh: 'Fresh',
  ready: 'Ready',
  stale: 'Stale',
  partial: 'Partial',
  loading: 'Loading',
  empty: 'Empty',
  missing: 'Missing',
  unavailable: 'Unavailable',
  error: 'Error',
};

export interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
  detail?: string;
  className?: string;
}

export function StatusBadge({status, label = statusLabels[status], detail, className = ''}: StatusBadgeProps) {
  return <span className={`ui-status-badge ui-status-badge--${status}${className ? ` ${className}` : ''}`} role="status" aria-label={detail ? `${label}: ${detail}` : label}>
    <span className="ui-status-badge__dot" aria-hidden="true" />
    <span>{label}</span>
    {detail && <span className="ui-status-badge__detail">{detail}</span>}
  </span>;
}

export interface MetricCardProps {
  label: string;
  value: ReactNode | null;
  unit?: ReactNode;
  note?: ReactNode;
  status?: StatusKind;
  tone?: MetricTone;
  loading?: boolean;
  missingLabel?: string;
}

/** A compact display primitive. Null means absent; numeric zero remains a real value. */
export function MetricCard({
  label,
  value,
  unit,
  note,
  status,
  tone = 'neutral',
  loading = false,
  missingLabel = 'Value unavailable',
}: MetricCardProps) {
  const missing = !loading && value == null;
  return <article className={`ui-metric-card ui-metric-card--${tone}${missing ? ' is-missing' : ''}`} aria-label={`${label}${missing ? `, ${missingLabel}` : ''}`}>
    <div className="ui-metric-card__top">
      <h3 className="ui-metric-card__label">{label}</h3>
      {status && <StatusBadge status={status} />}
    </div>
    <div className="ui-metric-card__value-row" aria-busy={loading || undefined}>
      {loading
        ? <span className="ui-metric-card__skeleton" role="status" aria-label={`Loading ${label}`} />
        : missing
          ? <><span className="ui-metric-card__missing" aria-hidden="true">—</span><span className="ui-status-visually-hidden">{missingLabel}</span></>
          : <span className="ui-metric-card__value">{value}</span>}
      {!loading && value != null && unit && <span className="ui-metric-card__unit">{unit}</span>}
    </div>
    {note && <div className="ui-metric-card__note">{note}</div>}
  </article>;
}

export type ResultStateKind = 'loading' | 'empty' | 'partial' | 'unavailable' | 'missing' | 'error' | 'stale';

export interface ResultStateProps {
  status: ResultStateKind;
  title?: string;
  description?: ReactNode;
  detail?: ReactNode;
  action?: {label: string; onAction: () => void};
  className?: string;
}

const resultCopy: Record<ResultStateKind, {title: string; description: string}> = {
  loading: {title: 'Loading result', description: 'The prepared result is being read.'},
  empty: {title: 'No results', description: 'There is nothing to show for the current selection.'},
  partial: {title: 'Partial result', description: 'Some observations are unavailable. Review coverage before comparing totals.'},
  unavailable: {title: 'Result unavailable', description: 'This result is not available for the current selection.'},
  missing: {title: 'No prepared result', description: 'No result has been published for the current selection.'},
  error: {title: 'Could not load result', description: 'The result could not be read. The source may be available again later.'},
  stale: {title: 'Result may be out of date', description: 'The latest published result is older than expected.'},
};

function ResultIcon({status}: {status: ResultStateKind}) {
  if (status === 'loading') return <span className="ui-result-state__spinner" aria-hidden="true" />;
  if (status === 'error') return <span className="ui-result-state__mark" aria-hidden="true">!</span>;
  if (status === 'missing' || status === 'empty') return <span className="ui-result-state__mark" aria-hidden="true">—</span>;
  if (status === 'stale') return <span className="ui-result-state__mark" aria-hidden="true">◷</span>;
  if (status === 'partial') return <span className="ui-result-state__mark" aria-hidden="true">◐</span>;
  return <span className="ui-result-state__mark" aria-hidden="true">i</span>;
}

export function ResultState({status, title, description, detail, action, className = ''}: ResultStateProps) {
  const copy = resultCopy[status];
  return <section
    className={`ui-result-state ui-result-state--${status}${className ? ` ${className}` : ''}`}
    role={status === 'error' ? 'alert' : 'status'}
    aria-live={status === 'error' ? 'assertive' : 'polite'}
    aria-busy={status === 'loading' || undefined}
  >
    <div className="ui-result-state__icon"><ResultIcon status={status} /></div>
    <div className="ui-result-state__copy">
      <div className="ui-result-state__heading-row">
        <h3>{title ?? copy.title}</h3>
        <StatusBadge status={status} />
      </div>
      <p>{description ?? copy.description}</p>
      {detail && <div className="ui-result-state__detail">{detail}</div>}
    </div>
    {action && <button className="ui-result-state__action" type="button" onClick={action.onAction}>{action.label}</button>}
  </section>;
}

export interface PanelHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  className?: string;
}

export function PanelHeader({title, eyebrow, subtitle, meta, actions, titleId, className = ''}: PanelHeaderProps) {
  const generatedId = useId();
  return <header className={`ui-panel-header${className ? ` ${className}` : ''}`}>
    <div className="ui-panel-header__content">
      {eyebrow && <div className="ui-panel-header__eyebrow">{eyebrow}</div>}
      <div className="ui-panel-header__title-row">
        <h2 id={titleId ?? generatedId} className="ui-panel-header__title">{title}</h2>
        {meta && <div className="ui-panel-header__meta">{meta}</div>}
      </div>
      {subtitle && <div className="ui-panel-header__subtitle">{subtitle}</div>}
    </div>
    {actions && <div className="ui-panel-header__actions">{actions}</div>}
  </header>;
}

export interface InspectorShellProps {
  title: string;
  eyebrow?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  entityLabel?: string;
  emptyState?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A semantic detail aside with an optional explicit no-selection view. */
export function InspectorShell({
  title,
  eyebrow,
  subtitle,
  meta,
  actions,
  entityLabel,
  emptyState,
  children,
  className = '',
}: InspectorShellProps) {
  const titleId = useId();
  const content = children ?? emptyState;
  return <aside className={`ui-inspector-shell${className ? ` ${className}` : ''}`} aria-labelledby={titleId}>
    <PanelHeader title={title} eyebrow={eyebrow} subtitle={subtitle} meta={meta} actions={actions} titleId={titleId} />
    <div className="ui-inspector-shell__content" role={entityLabel ? 'region' : undefined} aria-label={entityLabel ? `Details for ${entityLabel}` : undefined}>
      {entityLabel && <div className="ui-inspector-shell__entity">{entityLabel}</div>}
      {content}
    </div>
  </aside>;
}

export default InspectorShell;
