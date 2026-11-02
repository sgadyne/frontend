import type {ComparisonData, ContextResponse, Envelope, HistoryData} from '../../apps/pod-risk-lens/src/domain/types';

export interface RiskLensDataProvider {
  loadContext(): Promise<ContextResponse>;
  loadComparison(horizon: string, endpoint: string, end?: string, start?: string): Promise<Envelope<ComparisonData>>;
  loadTrades(): Promise<Envelope<ComparisonData>>;
  loadHistory(stamp: string, riskIds: string[], range: string): Promise<Envelope<HistoryData>>;
}
