export type Layout = 'comparison' | 'performance' | 'exposure' | 'matrix' | 'detail' | 'operations';
export interface ReportView {id: string; label: string; layout: Layout}
export interface ReportDefinition {id: string; title: string; description: string; section: string; icon: string; views: ReportView[]; related: string[]}
export function reportRegistry(reports:readonly ReportDefinition[]) {
  const registry=new Map(reports.map(report=>[report.id,report]));
  if (!reports.length || registry.size!==reports.length) throw new Error('Select distinct report definitions.');
  for(const report of reports){
    if(!report.id||!report.views.length||new Set(report.views.map(v=>v.id)).size!==report.views.length)
      throw new Error('Invalid report/view definition.');
    if(report.related.some(id=>!registry.has(id)))throw new Error('Related report is not configured.');
  }
  return registry;
}
