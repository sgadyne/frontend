export interface ContributionChartGroupRef {
  key: string;
  category: string;
  unit: string;
  itemIds: readonly string[];
}

export const contributionChartGroupKey = (category: string, unit: string) => JSON.stringify([category, unit]);

function categoryFromKey(key: string): string | null {
  try {
    const value: unknown = JSON.parse(key);
    return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null;
  } catch {
    return null;
  }
}

/** Keep an exact chart choice, then its category across unit changes, then selection, then first group. */
export function resolveContributionChartGroup(
  groups: readonly ContributionChartGroupRef[],
  currentKey: string | null,
  selectedId?: string | null,
): string | null {
  if (!groups.length) return null;
  if (currentKey && groups.some(group => group.key === currentKey)) return currentKey;

  const previousCategory = currentKey ? categoryFromKey(currentKey) : null;
  if (previousCategory) {
    const sameCategory = groups.filter(group => group.category === previousCategory);
    if (sameCategory.length) {
      return sameCategory.find(group => selectedId && group.itemIds.includes(selectedId))?.key ?? sameCategory[0].key;
    }
  }

  const selectedGroup = groups.find(group => selectedId && group.itemIds.includes(selectedId));
  return selectedGroup?.key ?? groups[0].key;
}

export function adjacentContributionChartIndex(index: number, direction: -1 | 1, count: number): number | null {
  const adjacent = index + direction;
  return index >= 0 && adjacent >= 0 && adjacent < count ? adjacent : null;
}

export function normalizeContributionWheelDelta(deltaY: number, deltaMode: number, pageSize: number): number {
  if (!Number.isFinite(deltaY)) return 0;
  const multiplier = deltaMode === 1 ? 16 : deltaMode === 2 ? Math.max(1, pageSize) : 1;
  return deltaY * multiplier;
}
