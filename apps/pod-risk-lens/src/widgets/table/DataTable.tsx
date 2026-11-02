import {memo, useCallback, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {CSSProperties, KeyboardEvent, ReactNode} from 'react';
import {Button, SearchField} from '../../ui/foundation';
import './DataTable.css';

export type TableSortValue = string | number | null | undefined;

export interface TableCopyContext {
  label: string;
  value: string;
}

export interface TableColumn<Row> {
  /** A stable identifier used by visibility controls and sorting. */
  id: string;
  /** Visible column name and accessible sort-control name. */
  header: string;
  /** Pure display from the immutable row; new row/column identities invalidate the memoized cell. */
  cell: (row: Row) => ReactNode;
  /** Provide a value to make the column sortable. Nulls and non-finite numbers sort last. */
  sortValue?: (row: Row) => TableSortValue;
  /** Provide an explicit truthful text representation to enable table copying. */
  copyValue?: (row: Row) => string;
  align?: 'start' | 'end';
  className?: string;
  headerClassName?: string;
  /** Render values in this column as native row headers. */
  rowHeader?: boolean;
  /** Whether users may hide this column. Defaults to true. */
  hideable?: boolean;
  /** Initial visibility for an uncontrolled table. Defaults to true. */
  initiallyVisible?: boolean;
}

export interface DataTableProps<Row> {
  rows: readonly Row[];
  columns: readonly TableColumn<Row>[];
  getRowId: (row: Row) => string;
  ariaLabel: string;
  selectedRowId?: string | null;
  onRowSelect?: (row: Row) => void;
  /** Human readable identity used to name the row and its selection button. */
  getRowLabel?: (row: Row) => string;
  getRowTitle?: (row: Row) => string | undefined;
  getRowClassName?: (row: Row) => string | undefined;
  /** Optional controlled query. Filtering requires getSearchText. */
  query?: string;
  /** Supplying both query and this callback adds an accessible search field. */
  onQueryChange?: (query: string) => void;
  getSearchText?: (row: Row) => string;
  searchLabel?: string;
  searchPlaceholder?: string;
  /** Hidden column identifiers; omit for local visibility state. */
  hiddenColumnIds?: readonly string[];
  onHiddenColumnIdsChange?: (hiddenColumnIds: readonly string[]) => void;
  emptyMessage?: string;
  emptySearchMessage?: (query: string) => string;
  countLabel?: (count: number) => string;
  caption?: string;
  /** App-supplied applied context copied before the column header. */
  copyContext?: readonly TableCopyContext[];
  maxHeight?: CSSProperties['maxHeight'];
  className?: string;
}

interface SortState {
  columnId: string;
  direction: 'ascending' | 'descending';
}

const collator = new Intl.Collator('en', {numeric: true, sensitivity: 'base'});

interface CellContentProps<Row> {
  row: Row;
  column: TableColumn<Row>;
}

function CellContent<Row>({row, column}: CellContentProps<Row>) {
  return <>{column.cell(row)}</>;
}

const MemoizedCellContent = memo(CellContent) as typeof CellContent;

interface TableRowProps<Row> {
  row: Row;
  columns: readonly TableColumn<Row>[];
  id: string;
  label: string;
  title?: string;
  className?: string;
  selected: boolean;
  selectable: boolean;
  onSelect: (row: Row) => void;
}

function TableRow<Row>({row, columns, id, label, title, className, selected, selectable, onSelect}: TableRowProps<Row>) {
  const hasVisibleRowHeader = columns.some(column => column.rowHeader);
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onSelect(row);
  };

  return (
    <tr
      className={`risk-data-table__row${selectable ? ' is-selectable' : ''}${className ? ` ${className}` : ''}`}
      aria-label={selectable ? label : undefined}
      title={title || undefined}
      {...(selectable ? {
        tabIndex: hasVisibleRowHeader ? undefined : 0,
        'aria-selected': selected,
        onClick: () => onSelect(row),
        onKeyDown: hasVisibleRowHeader ? undefined : handleKeyDown,
      } : {})}
    >
      {columns.map(column => {
        const cellClassName = [column.align === 'end' ? 'is-end' : '', column.className]
          .filter(Boolean)
          .join(' ');
        return column.rowHeader
          ? <th key={column.id} scope="row" className={cellClassName || undefined}>
            {selectable
              ? <button
                type="button"
                className="risk-data-table__select"
                aria-label={`Select ${label}`}
                aria-pressed={selected}
                onClick={event => { event.stopPropagation(); onSelect(row); }}
              ><MemoizedCellContent row={row} column={column} /></button>
              : <MemoizedCellContent row={row} column={column} />}
          </th>
          : <td key={column.id} className={cellClassName || undefined}><MemoizedCellContent row={row} column={column} /></td>;
      })}
    </tr>
  );
}

const MemoizedTableRow = memo(TableRow) as typeof TableRow;

function normalizedSortValue(value: TableSortValue): string | number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return value;
}

function compareValues(left: string | number, right: string | number) {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return collator.compare(String(left), String(right));
}

function quoteTsv(value: string) {
  return /[\t\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Serializes the visible table with optional app-owned context rows. */
export function serializeTableCopy<Row>(columns: readonly TableColumn<Row>[], rows: readonly Row[], copyContext: readonly TableCopyContext[] = []) {
  const contextLines = copyContext
    .filter(item => item.label.trim() && item.value.trim())
    .map(item => `Context\t${quoteTsv(item.label)}\t${quoteTsv(item.value)}`);
  const header = columns.map(column => quoteTsv(column.header)).join('\t');
  const body = rows.map(row => columns.map(column => quoteTsv(column.copyValue!(row))).join('\t'));
  return [...(contextLines.length ? [...contextLines, ''] : []), header, ...body].join('\r\n');
}

export function DataTable<Row>({
  rows,
  columns,
  getRowId,
  ariaLabel,
  selectedRowId,
  onRowSelect,
  getRowLabel,
  getRowTitle,
  getRowClassName,
  query,
  onQueryChange,
  getSearchText,
  searchLabel = `Search ${ariaLabel.toLocaleLowerCase()}`,
  searchPlaceholder = 'Search rows',
  hiddenColumnIds,
  onHiddenColumnIdsChange,
  emptyMessage = 'No rows are available.',
  emptySearchMessage = value => `No rows match “${value}”.`,
  countLabel = count => `${count} ${count === 1 ? 'row' : 'rows'}`,
  caption,
  copyContext = [],
  maxHeight = 'min(58vh, 26rem)',
  className = '',
}: DataTableProps<Row>) {
  const generatedId = useId();
  const onRowSelectRef = useRef(onRowSelect);
  useLayoutEffect(() => {
    onRowSelectRef.current = onRowSelect;
  }, [onRowSelect]);
  const selectRow = useCallback((row: Row) => onRowSelectRef.current?.(row), []);
  const [internalHiddenColumnIds, setInternalHiddenColumnIds] = useState<readonly string[]>(() =>
    columns.filter(column => column.initiallyVisible === false).map(column => column.id),
  );
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const hiddenIds = hiddenColumnIds ?? internalHiddenColumnIds;
  const hiddenIdSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const requestedVisibleColumns = useMemo(
    () => columns.filter(column => !hiddenIdSet.has(column.id)),
    [columns, hiddenIdSet],
  );
  const visibleColumns = useMemo(
    () => requestedVisibleColumns.length > 0 ? requestedVisibleColumns : columns.slice(0, 1),
    [columns, requestedVisibleColumns],
  );
  const visibleColumnIdSet = useMemo(() => new Set(visibleColumns.map(column => column.id)), [visibleColumns]);
  const hideableColumns = columns.filter(column => column.hideable !== false);
  const queryText = query?.trim() ?? '';

  const visibleRows = useMemo(() => {
    const filtered = queryText && getSearchText
      ? rows.filter(row => getSearchText(row).toLocaleLowerCase().includes(queryText.toLocaleLowerCase()))
      : [...rows];
    if (!sortState) return filtered;
    const sortColumn = columns.find(column => column.id === sortState.columnId);
    if (!sortColumn?.sortValue) return filtered;
    const direction = sortState.direction;
    const getSortValue = sortColumn.sortValue;

    return filtered
      .map((row, index) => ({row, index, value: normalizedSortValue(getSortValue(row))}))
      .sort((left, right) => {
        // Missing and non-finite values remain last regardless of sort direction.
        if (left.value == null) return right.value == null ? left.index - right.index : 1;
        if (right.value == null) return -1;
        const comparison = compareValues(left.value, right.value);
        if (comparison === 0) return left.index - right.index;
        return direction === 'ascending' ? comparison : -comparison;
      })
      .map(item => item.row);
  }, [columns, getSearchText, queryText, rows, sortState]);

  const copyable = visibleColumns.length > 0 && visibleColumns.every(column => column.copyValue);

  const handleVisibilityChange = (columnId: string, shouldHide: boolean) => {
    const nextHidden = shouldHide
      ? [...hiddenIds, columnId]
      : hiddenIds.filter(id => id !== columnId);
    if (hiddenColumnIds === undefined) setInternalHiddenColumnIds(nextHidden);
    onHiddenColumnIdsChange?.(nextHidden);
    if (shouldHide && sortState?.columnId === columnId) setSortState(null);
  };

  const handleCopy = async () => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(serializeTableCopy(visibleColumns, visibleRows, copyContext));
      setCopyStatus(`Copied ${countLabel(visibleRows.length)} and ${visibleColumns.length} columns.`);
    } catch {
      setCopyStatus('Could not access the clipboard.');
    }
  };

  const sortBy = (columnId: string) => setSortState(current => current?.columnId === columnId
    ? {columnId, direction: current.direction === 'ascending' ? 'descending' : 'ascending'}
    : {columnId, direction: 'ascending'});

  const noRowsMessage = rows.length === 0
    ? emptyMessage
    : queryText && getSearchText
      ? emptySearchMessage(queryText)
      : emptyMessage;

  return (
    <section className={`risk-data-table${className ? ` ${className}` : ''}`}>
      <div className="risk-data-table__toolbar">
        <span className="risk-data-table__count" aria-live="polite">{countLabel(visibleRows.length)}</span>
        <div className="risk-data-table__actions">
          {query !== undefined && onQueryChange && getSearchText && (
            <SearchField
              id={`risk-data-table-search-${generatedId}`}
              label={searchLabel}
              value={query}
              onChange={onQueryChange}
              placeholder={searchPlaceholder}
              className="risk-data-table__search"
            />
          )}
          {hideableColumns.length > 0 && (
            <details className="risk-data-table__columns">
              <summary>Columns</summary>
              <fieldset>
                <legend>Visible columns</legend>
                {hideableColumns.map(column => {
                  const isVisible = visibleColumnIdSet.has(column.id);
                  return (
                    <label key={column.id}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        disabled={isVisible && visibleColumns.length === 1}
                        onChange={event => handleVisibilityChange(column.id, !event.currentTarget.checked)}
                      />
                      <span>{column.header}</span>
                    </label>
                  );
                })}
              </fieldset>
            </details>
          )}
          {copyable && <Button className="risk-data-table__copy" onClick={handleCopy}>Copy visible rows</Button>}
        </div>
      </div>
      {copyStatus && <span className="risk-data-table__copy-status" role="status">{copyStatus}</span>}
      <div
        className="risk-data-table__viewport"
        role="region"
        aria-label={`${ariaLabel} table`}
        tabIndex={0}
        style={{maxHeight}}
      >
        <table className="risk-data-table__grid" aria-label={ariaLabel}>
          {caption && <caption>{caption}</caption>}
          <thead>
            <tr>
              {visibleColumns.map(column => {
                const direction = sortState?.columnId === column.id ? sortState.direction : null;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortValue ? direction ?? 'none' : undefined}
                    className={`risk-data-table__heading${column.align === 'end' ? ' is-end' : ''}${column.headerClassName ? ` ${column.headerClassName}` : ''}`}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        className="risk-data-table__sort"
                        onClick={() => sortBy(column.id)}
                        aria-label={`Sort by ${column.header}${direction ? `, currently ${direction}` : ''}`}
                      >
                        <span>{column.header}</span>
                        <span className={`risk-data-table__sort-mark${direction ? ' is-active' : ''}`} aria-hidden="true">
                          {direction === 'ascending' ? '▲' : direction === 'descending' ? '▼' : '↕'}
                        </span>
                      </button>
                    ) : column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(row => {
              const id = getRowId(row);
              const selected = selectedRowId != null && id === selectedRowId;
              const rowLabel = getRowLabel?.(row) ?? id;
              const rowClassName = getRowClassName?.(row);
              return (
                <MemoizedTableRow
                  key={id}
                  row={row}
                  columns={visibleColumns}
                  id={id}
                  label={rowLabel}
                  title={getRowTitle?.(row)}
                  className={rowClassName}
                  selected={selected}
                  selectable={onRowSelect !== undefined}
                  onSelect={selectRow}
                />
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && <div className="risk-data-table__empty" role="status">{noRowsMessage}</div>}
      </div>
    </section>
  );
}
