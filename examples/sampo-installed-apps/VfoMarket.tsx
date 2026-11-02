import { SampoAppearanceProvider } from "../../packages/presentation/src";
import type { WidgetProps } from "@sampo/sdk-react";
import {
  MarketUniverseWorkbench,
  type MarketUniverseState,
} from "../../packages/vfo-workspace-core/src/market/UniverseWorkbench";
import {
  marketAssets,
  marketGroups,
  navigation,
  catalogueRevision,
  catalogueAsOf,
  demoCoverage,
  historyWindow,
} from "./market-universe-data";
export function Vfo(props: WidgetProps) {
  return (
    <SampoAppearanceProvider>
      <div className="sampo-analysis-fixture">
        <div className="analysis-fixture-notice">
          Static market catalogue · synthetic coverage demo · no live sources or
          submitted jobs
        </div>
        <MarketUniverseWorkbench
          assets={marketAssets}
          groups={marketGroups}
          navigation={navigation}
          catalogueRevision={catalogueRevision}
          catalogueAsOf={catalogueAsOf}
          coverage={demoCoverage}
          historyWindow={historyWindow}
          initialState={props.viewState as Partial<MarketUniverseState>}
          onStateChange={(state) => props.onViewStateChange?.(state)}
        />
      </div>
    </SampoAppearanceProvider>
  );
}
