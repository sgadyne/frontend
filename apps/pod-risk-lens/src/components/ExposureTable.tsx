import type {ExposureRow} from '../domain/types';
import {rowKey} from '../domain/types';
import {formatMillions, formatSignedMillions} from '../domain/format';
import {exactNumericCopy} from '../features/risk-lens/tableCopy';
import {DataTable} from '../widgets/table';
import type {TableColumn} from '../widgets/table';
import './ExposureTable.css';

export interface ExposureTableProps {
  rows: ExposureRow[];
  selectedKey: string | null;
  onSelect: (row: ExposureRow) => void;
  query?: string;
  copyContext?: readonly {label: string; value: string}[];
}

const searchableText = (row: ExposureRow) =>
  [row.underlying, row.pod, row.tag, row.asset_class, row.currency, row.context, row.exposure_id]
    .filter(Boolean)
    .join(' ');

const columns: readonly TableColumn<ExposureRow>[] = [
  {
    id: 'underlying', header: 'Exposure', rowHeader: true, className: 'exposure-table__exposure-cell',
    sortValue: row => row.underlying,
    cell: row => <span className="exposure-table__identity">
      <span className="exposure-table__symbol">{row.underlying}</span>
      <span className="exposure-table__secondary">
        {row.asset_class}<span aria-hidden="true"> · </span>{row.currency}
        {row.unit && <span className="exposure-table__unit"> · {row.unit}</span>}
      </span>
    </span>,
    copyValue: row => `${row.underlying} — ${row.asset_class} · ${row.currency}${row.unit ? ` · ${row.unit}` : ''}`,
  },
  {
    id: 'podTag', header: 'Pod / tag', className: 'exposure-table__pod-cell',
    sortValue: row => `${row.pod} ${row.tag}`,
    cell: row => <span className="exposure-table__pod-group">
      <span className="exposure-table__pod">{row.pod}</span>
      <span className="exposure-table__tag">{row.tag}</span>
    </span>,
    copyValue: row => `${row.pod} · ${row.tag}`,
  },
  {
    id: 'start_m', header: 'Start delta · $M', align: 'end', className: 'exposure-table__number',
    sortValue: row => row.start_m,
    cell: row => formatMillions(row.start_m),
    copyValue: row => exactNumericCopy(row.start_m),
  },
  {
    id: 'end_m', header: 'End delta · $M', align: 'end', className: 'exposure-table__number',
    sortValue: row => row.end_m,
    cell: row => formatMillions(row.end_m),
    copyValue: row => exactNumericCopy(row.end_m),
  },
  {
    id: 'change_m', header: 'Delta change · $M', align: 'end', className: 'exposure-table__number',
    sortValue: row => row.change_m,
    cell: row => <span className={valueTone(row.change_m)}>{formatSignedMillions(row.change_m)}</span>,
    copyValue: row => exactNumericCopy(row.change_m),
  },
  {
    id: 'signed_risk_end_m', header: 'Daily risk · signed $M / day', align: 'end', className: 'exposure-table__number',
    sortValue: row => row.signed_risk_end_m,
    cell: row => <span className={valueTone(row.signed_risk_end_m)}>{formatSignedMillions(row.signed_risk_end_m, 3)}</span>,
    copyValue: row => exactNumericCopy(row.signed_risk_end_m),
  },
  {
    id: 'vol_change_m', header: 'Gross risk change · $M / day', align: 'end', className: 'exposure-table__number',
    sortValue: row => row.vol_change_m,
    cell: row => <span className={valueTone(row.vol_change_m)}>{formatSignedMillions(row.vol_change_m, 4)}</span>,
    copyValue: row => exactNumericCopy(row.vol_change_m),
  },
  {
    id: 'signed_risk_start_m', header: 'Start signed risk · $M / day', align: 'end', className: 'exposure-table__number', initiallyVisible: false,
    sortValue: row => row.signed_risk_start_m,
    cell: row => formatSignedMillions(row.signed_risk_start_m, 3),
    copyValue: row => exactNumericCopy(row.signed_risk_start_m),
  },
  {
    id: 'risk_equivalent_change_m', header: 'Risk-equivalent move · $M / day', align: 'end', className: 'exposure-table__number', initiallyVisible: false,
    sortValue: row => row.risk_equivalent_change_m,
    cell: row => <span className={valueTone(row.risk_equivalent_change_m ?? null)}>{formatSignedMillions(row.risk_equivalent_change_m, 4)}</span>,
    copyValue: row => exactNumericCopy(row.risk_equivalent_change_m),
  },
  {
    id: 'eligible', header: 'Status', sortValue: row => row.eligible ? 1 : 0,
    cell: row => <span className={`exposure-table__status${row.eligible ? ' is-eligible' : ' is-ineligible'}`}>
      <span className="exposure-table__status-dot" aria-hidden="true" />{row.eligible ? 'Eligible' : 'Ineligible'}
    </span>,
    copyValue: row => row.eligible ? 'Eligible' : 'Ineligible',
  },
];

function valueTone(value: number | null) {
  return `exposure-table__value${value == null || !Number.isFinite(value) ? ' is-missing' : value > 0 ? ' is-positive' : value < 0 ? ' is-negative' : ''}`;
}

export default function ExposureTable({rows, selectedKey, onSelect, query, copyContext}: ExposureTableProps) {
  return (
    <section className="exposure-table" aria-label="Exposure details">
      <div className="exposure-table__units">Delta values in USD millions; risk values in USD millions per day; row unit shown with each exposure.</div>
      <DataTable
        className="exposure-table__data"
        rows={rows}
        columns={columns}
        getRowId={rowKey}
        ariaLabel="Exposure details"
        selectedRowId={selectedKey}
        onRowSelect={onSelect}
        getRowLabel={row => `${row.underlying}, ${row.asset_class}, ${row.currency}, pod ${row.pod}, tag ${row.tag}`}
        getRowTitle={row => [row.context, row.source ? `Source: ${row.source}` : undefined].filter(Boolean).join(' · ')}
        getRowClassName={row => row.eligible ? undefined : 'is-ineligible'}
        query={query}
        copyContext={copyContext}
        getSearchText={searchableText}
        countLabel={count => `${count} ${count === 1 ? 'exposure' : 'exposures'}`}
        emptyMessage="No exposures are available for this view."
        emptySearchMessage={value => `No exposures match “${value}”.`}
        searchLabel="Search exposures"
        searchPlaceholder="Search underlying, pod, tag…"
        maxHeight="min(58vh, 23rem)"
      />
    </section>
  );
}
