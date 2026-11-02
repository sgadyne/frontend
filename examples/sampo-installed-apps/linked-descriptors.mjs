import {validateLinkedDescriptor,publishedEntryAddress} from '@sampo/contracts';
import * as schemas from './linked-schemas.mjs';
export const appNames = {risk:'risk-lens',vfo:'vfo',cluster:'cluster',replication:'replication'};
const titles = {risk:'Risk Lens',vfo:'VFO',cluster:'Cluster',replication:'Replication'};
export function createAppDescriptor(name) {
  if (!Object.hasOwn(appNames,name)) throw new TypeError('Select a demonstration app');
  const applicationId='example.'+appNames[name], contributionId=applicationId+'.main';
  const route=(id,selectionSchema=schemas[name+'SelectionSchema'])=>({id,contributionId,selectionSchema,presentations:['open','peek','addToDraft'],shareable:true,portableState:{id:contributionId+'.state',version:name==='vfo'?2:1,schema:schemas[name+'StateSchema']}});
  const routes=[route(name)];
  if(name==='vfo')for(const view of ['universe','live','history'])routes.push(route('vfo.'+view,{...schemas.vfoSelectionSchema,properties:{...schemas.vfoSelectionSchema.properties,view:schemas.string(16,[view])},required:['view']}));
  if(name==='vfo')routes.push(route('vfo.instrument',schemas.instrumentSelectionSchema));
  const reference=(target)=>({id:'related-'+target,relation:'references',target:publishedEntryAddress({publisherId:'sampo.synthetic',applicationId:'example.'+appNames[target],entryId:target})});
  // Link titles come from authorized resolution, not a locally cached protected target label.
  const references=name==='vfo'?[reference('risk'),reference('replication')]:name==='risk'||name==='replication'?[reference('vfo')]:[];
  return validateLinkedDescriptor({schemaVersion:1,publisherId:'sampo.synthetic',applicationId,entries:[{id:name,title:titles[name],routeId:name,selection:{}}],routes,references,reuse:[]});
}
