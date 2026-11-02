// Compatibility entry for local previews. Installed builds use the four isolated entries.
import {Risk} from './RiskApp';
import {Vfo} from './VfoMarket';
import {Cluster} from './ClusterApp';
import {Replication} from './ReplicationApp';
import {demoApplication} from './fixture-frame';
export {Risk,Vfo,Cluster,Replication};
export default {runtimeAbi:1,applications:Object.fromEntries(['example.risk-lens','example.vfo','example.cluster','example.replication'].map(id=>[id,demoApplication])),widgets:{Risk:{id:'example.risk-lens.main',Component:Risk},Vfo:{id:'example.vfo.main',Component:Vfo},Cluster:{id:'example.cluster.main',Component:Cluster},Replication:{id:'example.replication.main',Component:Replication}}};
