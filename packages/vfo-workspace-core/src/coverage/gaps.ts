import type {Timeline} from '../command-client';
import {sourceHistories} from '../history';
import {dateAdd} from '../command-client';
export type RepairRun={asset:string;source:string;start:string;end:string;sessions:number;kind:'gap'|'fallback'|'failed';reason:string};
export function repairRuns(timeline:Timeline):RepairRun[]{
 const result:RepairRun[]=[];
 for(const history of sourceHistories(timeline)){let run:RepairRun|null=null;
  for(const cell of history.dates){const day=cell.selected?.day;if(day?.session===false)continue;
   const kind=day?.state==='missing'?'gap':day?.state==='failed'?'failed':day?.quality?.state==='warning'&&day.quality.assessment_revision?'fallback':null;
   if(!kind){run=null;continue;}
   if(run&&run.kind===kind){run.end=dateAdd(cell.date,1);run.sessions++;}
   else{run={asset:timeline.asset,source:history.source,start:cell.date,end:dateAdd(cell.date,1),sessions:1,kind,reason:day?.error_code??day?.quality?.reason??(kind==='gap'?'Confirmed recorded session gap':'Recorded computation evidence')};result.push(run);}
  }
 }
 return result.sort((a,b)=>b.sessions-a.sessions||a.start.localeCompare(b.start));
}
