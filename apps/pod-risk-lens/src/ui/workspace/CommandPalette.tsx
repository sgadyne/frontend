import {useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import './CommandPalette.css';

export interface CommandEntry {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  group: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export interface CommandPaletteShortcutOptions {
  key?: string;
  modifier?: 'ctrl' | 'meta' | 'either';
  enabled?: boolean;
}

const defaultShortcut: Required<CommandPaletteShortcutOptions> = {
  key: 'k',
  modifier: 'either',
  enabled: true,
};

/** Attach the palette's keyboard trigger to any owning component. */
export function useCommandPaletteShortcut(
  onTrigger: () => void,
  options: CommandPaletteShortcutOptions = {},
) {
  const {key, modifier, enabled} = {...defaultShortcut, ...options};

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const matchesModifier = modifier === 'ctrl'
        ? event.ctrlKey && !event.metaKey
        : modifier === 'meta'
          ? event.metaKey && !event.ctrlKey
          : event.ctrlKey || event.metaKey;
      if (!matchesModifier || event.altKey || event.shiftKey || event.repeat || event.isComposing) return;
      if (event.key.toLocaleLowerCase() !== key.toLocaleLowerCase()) return;
      event.preventDefault();
      onTrigger();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, key, modifier, onTrigger]);
}

interface ScoredEntry {
  entry: CommandEntry;
  index: number;
  score: number;
}

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize('NFKD').replace(/\p{Diacritic}/gu, '');
}

function textMatchScore(candidate: string, query: string) {
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 82 - Math.min(candidate.length - query.length, 20) * 0.2;
  const containsAt = candidate.indexOf(query);
  if (containsAt >= 0) return 64 - Math.min(containsAt, 24) * 0.35;

  let queryIndex = 0;
  let gap = 0;
  let previous = -1;
  for (let i = 0; i < candidate.length && queryIndex < query.length; i += 1) {
    if (candidate[i] !== query[queryIndex]) continue;
    if (previous >= 0) gap += i - previous - 1;
    previous = i;
    queryIndex += 1;
  }
  return queryIndex === query.length ? Math.max(12, 42 - gap * 1.4) : null;
}

function scoreEntry(entry: CommandEntry, query: string): number | null {
  const fields = [
    {value: entry.label, weight: 1},
    {value: entry.keywords?.join(' ') ?? '', weight: 0.88},
    {value: entry.description ?? '', weight: 0.72},
    {value: entry.group, weight: 0.48},
  ].map(field => ({...field, value: normalize(field.value)}));
  let total = 0;
  for (const term of query.split(/\s+/).filter(Boolean)) {
    const best = fields.reduce<number | null>((current, field) => {
      const score = textMatchScore(field.value, term);
      if (score == null) return current;
      const weighted = score * field.weight;
      return current == null || weighted > current ? weighted : current;
    }, null);
    if (best == null) return null;
    total += best;
  }
  return total;
}

function commandMatches(entries: CommandEntry[], query: string): ScoredEntry[] {
  const normalizedQuery = normalize(query.trim());
  return entries.flatMap((entry, index) => {
    if (!normalizedQuery) return [{entry, index, score: 0}];
    const score = scoreEntry(entry, normalizedQuery);
    return score == null ? [] : [{entry, index, score}];
  }).sort((a, b) => b.score - a.score || a.index - b.index);
}

function shortcutHint(options: Required<CommandPaletteShortcutOptions>) {
  const key = options.key.toLocaleUpperCase();
  if (options.modifier === 'meta') return `⌘ ${key}`;
  if (options.modifier === 'ctrl') return `Ctrl ${key}`;
  return `Ctrl / ⌘ ${key}`;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: CommandEntry[];
  shortcut?: CommandPaletteShortcutOptions | false;
  label?: string;
  placeholder?: string;
  emptyMessage?: string;
  portalContainer?: HTMLElement | null;
}

/** Search and run explicitly registered actions. The consumer owns the action data. */
export function CommandPalette({
  open,
  onOpenChange,
  entries,
  shortcut,
  label = 'Command palette',
  placeholder = 'Search commands, views, or entities…',
  emptyMessage = 'No matching commands',
  portalContainer,
}: CommandPaletteProps) {
  const id = useId();
  const listId = `${id}-commands`;
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousOpen = useRef(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const shortcutOptions = {...defaultShortcut, ...(shortcut === false ? {enabled: false} : shortcut)};

  const openFromShortcut = useMemo(() => () => {
    if (!open) onOpenChange(true);
  }, [onOpenChange, open]);
  useCommandPaletteShortcut(openFromShortcut, shortcutOptions);

  const matches = useMemo(() => commandMatches(entries, query), [entries, query]);
  const enabledMatches = matches.filter(match => !match.entry.disabled);
  const activeMatch = enabledMatches.length ? enabledMatches[Math.min(activeIndex, enabledMatches.length - 1)] : undefined;
  const optionIds = new Map(matches.map((match, index) => [match.entry.id, `${listId}-option-${index}`]));

  useLayoutEffect(() => {
    if (open && !previousOpen.current) {
      const activeElement = document.activeElement;
      returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
      inputRef.current?.focus();
    } else if (!open && previousOpen.current) {
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus();
      returnFocusRef.current = null;
    }
    previousOpen.current = open;
  }, [open]);

  useEffect(() => {
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  if (!open) return null;

  const groupedMatches = new Map<string, ScoredEntry[]>();
  for (const match of matches) {
    const group = groupedMatches.get(match.entry.group) ?? [];
    group.push(match);
    groupedMatches.set(match.entry.group, group);
  }

  const moveActive = (step: number) => {
    if (!enabledMatches.length) return;
    setActiveIndex(current => (current + step + enabledMatches.length) % enabledMatches.length);
  };

  const selectEntry = (entry: CommandEntry) => {
    if (entry.disabled) return;
    onOpenChange(false);
    entry.onSelect();
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [closeRef.current, inputRef.current].filter(
      (element): element is HTMLButtonElement | HTMLInputElement => element !== null,
    );
    const currentIndex = focusable.findIndex(element => element === document.activeElement);
    if (event.shiftKey && currentIndex <= 0) {
      event.preventDefault();
      focusable.at(-1)?.focus();
    } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
      event.preventDefault();
      focusable[0]?.focus();
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home' && enabledMatches.length) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End' && enabledMatches.length) {
      event.preventDefault();
      setActiveIndex(enabledMatches.length - 1);
    } else if (event.key === 'Enter' && activeMatch) {
      event.preventDefault();
      selectEntry(activeMatch.entry);
    }
  };

  const dialog = (
    <div className="command-palette__scrim" onMouseDown={event => {
      if (event.target === event.currentTarget) onOpenChange(false);
    }}>
      <div className="command-palette" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} onKeyDown={handleDialogKeyDown}>
        <h2 id={`${id}-title`} className="command-palette__sr-only">{label}</h2>
        <div className="command-palette__search-row">
          <span className="command-palette__search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.4 4.4"/></svg>
          </span>
          <input
            ref={inputRef}
            className="command-palette__input"
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeMatch ? optionIds.get(activeMatch.entry.id) : undefined}
            value={query}
            placeholder={placeholder}
            onChange={event => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleInputKeyDown}
          />
          <span className="command-palette__shortcut-hint" aria-label={`Keyboard shortcut ${shortcutHint(shortcutOptions)}`}>
            {shortcutHint(shortcutOptions).split(' ').map((part, index) => <kbd key={`${part}-${index}`}>{part}</kbd>)}
          </span>
          <button ref={closeRef} className="command-palette__close" type="button" onClick={() => onOpenChange(false)} aria-label="Close command palette">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
          </button>
        </div>
        <div className="command-palette__results">
          <div className="command-palette__results-label">{query.trim() ? 'Results' : 'Available actions'}</div>
          <div id={listId} className="command-palette__list" role="listbox" aria-label="Commands">
            {matches.length > 0 && [...groupedMatches.entries()].map(([groupName, groupEntries], groupIndex) => {
              const groupId = `${listId}-group-${groupIndex}`;
              return <div className="command-palette__group" role="group" aria-labelledby={groupId} key={groupName}>
                <div className="command-palette__group-label" id={groupId}>{groupName}</div>
                {groupEntries.map(match => {
                  const isActive = !match.entry.disabled && activeMatch?.entry.id === match.entry.id;
                  const optionIndex = enabledMatches.findIndex(item => item.entry.id === match.entry.id);
                  return <div
                    className={`command-palette__option${isActive ? ' is-active' : ''}${match.entry.disabled ? ' is-disabled' : ''}`}
                    id={optionIds.get(match.entry.id)}
                    key={match.entry.id}
                    role="option"
                    aria-selected={isActive}
                    aria-disabled={match.entry.disabled || undefined}
                    tabIndex={-1}
                    onMouseMove={() => { if (!match.entry.disabled) setActiveIndex(optionIndex); }}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectEntry(match.entry)}
                  >
                    <span className="command-palette__option-copy">
                      <span className="command-palette__option-label">{match.entry.label}</span>
                      {match.entry.description && <span className="command-palette__option-description">{match.entry.description}</span>}
                    </span>
                    {match.entry.disabled && <span className="command-palette__unavailable">Unavailable</span>}
                    {match.entry.shortcut && <kbd className="command-palette__entry-shortcut">{match.entry.shortcut}</kbd>}
                    {!match.entry.disabled && <svg className="command-palette__enter-mark" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h11M10 5l5 5-5 5"/></svg>}
                  </div>;
                })}
              </div>;
            })}
          </div>
          {matches.length === 0 && <div className="command-palette__empty" role="status">{emptyMessage}</div>}
        </div>
        <div className="command-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
          <span><kbd>Enter</kbd> to select</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
  return portalContainer
    ? createPortal(<div className="risk-lens-portal-root">{dialog}</div>, portalContainer)
    : dialog;
}

export default CommandPalette;
