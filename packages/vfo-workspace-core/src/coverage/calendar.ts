export type CalendarDay = {
 date:string; tone:string; label:string; detail?:string; disabled?:boolean; snapshots?:number;
};
export type CalendarMonth = {
 key:string; year:string; days:CalendarDay[]; tone:string; label:string; recorded:number;
};
// Prefer a reported problem over healthy or unassessed records. These are
// supplied statuses, never classifications inferred from raw numeric metrics.
const priority = ['quality-bad','cov-failed','quality-warning','cov-quality_held',
 'cov-missing','quality-unknown','cov-unknown','cov-pending','cov-cancelled',
 'cov-computed','cov-observed','cov-verified','quality-good','cov-non_session'];
export function calendarMonths(days:CalendarDay[],start:string,end:string):CalendarMonth[]{
 const cursor=new Date(start.slice(0,7)+'-01T12:00:00Z'),endTime=Date.parse(end+'T12:00:00Z');
 if(!Number.isFinite(cursor.getTime())||!Number.isFinite(endTime)||end<=start)return [];
 const grouped=new Map<string,CalendarDay[]>();
 for(const day of days){if(day.date<start||day.date>=end)continue;const key=day.date.slice(0,7);const group=grouped.get(key)??[];group.push(day);grouped.set(key,group)}
 const months:CalendarMonth[]=[];
 while(cursor.getTime()<endTime){
  const key=cursor.toISOString().slice(0,7),entries=grouped.get(key)??[];
  const ranked=entries.filter(d=>d.tone!=='cov-non_session');
  const tone=priority.find(t=>ranked.some(d=>d.tone===t))??'cov-unknown';
  const worst=ranked.find(d=>d.tone===tone);
  months.push({key,year:key.slice(0,4),days:entries,tone,label:worst?.label??'No recorded observations',recorded:entries.filter(d=>!d.disabled).length});
  cursor.setUTCMonth(cursor.getUTCMonth()+1);
 }
 return months;
}
export function calendarDates(month:string,start:string,end:string):string[]{
 const cursor=new Date(month+'-01T12:00:00Z'),dates:string[]=[];
 if(!Number.isFinite(cursor.getTime()))return dates;
 while(cursor.toISOString().startsWith(month)){
  const date=cursor.toISOString().slice(0,10);
  if(date>=start&&date<end)dates.push(date);
  cursor.setUTCDate(cursor.getUTCDate()+1);
 }
 return dates;
}
