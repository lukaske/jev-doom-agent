import {ACTIONS,INTERACTIONS,MOVEMENTS,TRIGGERS,VIEWS,type Action,type ControlFrame,type Decision} from '../src/types';

let runtimeKey:string|null=null,requestsPaused=false;
const activeRequests=new Set<AbortController>();
export function setRuntimeKey(key:string){if(!/^apikey_[A-Za-z0-9_]+$/.test(key))throw new Error('INVALID_KEY');runtimeKey=key;requestsPaused=false}
export function clearRuntimeKey(){runtimeKey=null}
export function stopLiveRequests(){requestsPaused=true;for(const controller of activeRequests)controller.abort();activeRequests.clear()}
export function hasRuntimeKey(){return Boolean((runtimeKey||process.env.TYPESAFE_API_KEY)&&!requestsPaused)}

const movementCriteria:Record<ControlFrame['movement'],string>={HOLD_POSITION:'Do not translate.',EXPLORE_WORLD:'Navigate toward under-visited space.',MOVE_TO_ENEMY:'Path toward the nearest living enemy and stop at fighting distance.',RETREAT_FROM_ENEMY:'Create distance from the nearest enemy.',COLLECT_NEAREST_PICKUP:'Path toward the nearest useful pickup.',MOVE_TO_USE:'Path toward a usable door or switch.'};
const viewCriteria:Record<ControlFrame['view'],string>={KEEP_HEADING:'Keep the current heading.',SCAN:'Turn to inspect the environment.',FACE_ENEMY:'Center the nearest visible enemy.'};
const triggerCriteria:Record<ControlFrame['trigger'],string>={HOLD_FIRE:'Do not fire.',FIRE:'Press the weapon trigger.'};
const interactionCriteria:Record<ControlFrame['interaction'],string>={NO_USE:'Do not activate anything.',USE:'Activate a nearby door or switch.'};
type Choice={type:'choice';choice:string;confidence:number;probabilities:Record<string,number>};
function choice(data:unknown,name:string,allowed:readonly string[]):Choice|null{const value=(data as any)?.answers?.[name];return value?.type==='choice'&&allowed.includes(value.choice)&&typeof value.confidence==='number'&&value.probabilities?value:null}

export function parseDecision(data:unknown,latency=0):Decision|null{
 const movement=choice(data,'movement',MOVEMENTS),view=choice(data,'view',VIEWS),trigger=choice(data,'trigger',TRIGGERS),interaction=choice(data,'interaction',INTERACTIONS);if(!movement||!view||!trigger||!interaction)return null;
 const frame:ControlFrame={movement:movement.choice as ControlFrame['movement'],view:view.choice as ControlFrame['view'],trigger:trigger.choice as ControlFrame['trigger'],interaction:interaction.choice as ControlFrame['interaction']};
 const action:Action=frame.trigger==='FIRE'?'FIRE':frame.interaction==='USE'?'USE_NEAREST_LINE':frame.view==='FACE_ENEMY'?'FACE_ENEMY':frame.movement==='MOVE_TO_USE'?'USE_NEAREST_LINE':frame.movement==='HOLD_POSITION'?'IDLE':frame.movement;
 const probabilities=Object.fromEntries(ACTIONS.map(x=>[x,x===action?1:0]))as Record<Action,number>;
 return{action,frame,confidence:Math.min(movement.confidence,view.confidence,trigger.confidence,interaction.confidence),latency,probabilities};
}

export async function decideLive(state:unknown,systemPrompt?:unknown):Promise<Decision>{
 const key=runtimeKey||process.env.TYPESAFE_API_KEY;if(!key||requestsPaused)throw new Error('REQUESTS_STOPPED');const policy=typeof systemPrompt==='string'&&systemPrompt.trim()?systemPrompt.trim():'Play Doom autonomously from the complete structured game state.';
 const common={policy,constraints:['Choose all four axes independently; they execute simultaneously.','Approaching and facing do not imply firing. Fire only when a living enemy is visible, aligned, in range, and ammunition is appropriate.','Use the combat sensor, player condition, exploration memory, entities, and linedefs.','If stuck, change movement or view; do not idle without a reason.']};
 const started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);activeRequests.add(controller);
 try{const response=await fetch('https://api.typesafe.ai/v1/systemone',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json','authorization':`Bearer ${key}`},body:JSON.stringify({model:'jev-latest',state,questions:{movement:{type:'choice',instructions:{task:'Choose navigation for this tick.',...common},criteria:movementCriteria},view:{type:'choice',instructions:{task:'Choose where to look.',...common},criteria:viewCriteria},trigger:{type:'choice',instructions:{task:'Choose whether to fire.',...common},criteria:triggerCriteria},interaction:{type:'choice',instructions:{task:'Choose whether to use a nearby line.',...common},criteria:interactionCriteria}}})});if(!response.ok)throw new Error(`UPSTREAM_${response.status}`);const parsed=parseDecision(await response.json(),Date.now()-started);if(!parsed)throw new Error('MALFORMED_RESPONSE');return parsed}finally{clearTimeout(timer);activeRequests.delete(controller)}
}
