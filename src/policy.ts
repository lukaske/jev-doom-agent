import { ACTIONS, type Action, type ControlFrame, type Decision, type Observation, type Policy } from './types';
export const POLICY_TEXT: Record<Policy,string> = {survivalist:'Preserve health above everything else. Retreat early, use cover, collect health and armor, and avoid unnecessary fights.',berserker:'Fight aggressively. Close distance immediately, attack relentlessly, and never retreat unless death is imminent.'};
export function validAction(v: unknown): v is Action { return typeof v === 'string' && (ACTIONS as readonly string[]).includes(v); }
export function offlineDecision(o: Observation, policy: Policy): Decision {
 void policy;
 const enemy=[...(o.world?.entities??[])].filter(entity=>entity.enemy&&entity.health>0).sort((a,b)=>a.distance-b.distance)[0];
 const aligned=enemy&&Math.abs(enemy.relative_angle)<=0x04000000,close=enemy&&enemy.distance<=384;
 const frame:ControlFrame=enemy?{movement:close?'HOLD_POSITION':'MOVE_TO_ENEMY',view:'FACE_ENEMY',trigger:enemy.visible&&close&&aligned?'FIRE':'HOLD_FIRE',interaction:'NO_USE'}:{movement:'EXPLORE_WORLD',view:'SCAN',trigger:'HOLD_FIRE',interaction:'NO_USE'};
 const action:Action=frame.trigger==='FIRE'?'FIRE':frame.view==='FACE_ENEMY'?'FACE_ENEMY':frame.movement==='MOVE_TO_USE'?'USE_NEAREST_LINE':frame.movement==='HOLD_POSITION'?'IDLE':frame.movement;
 const probabilities=Object.fromEntries(ACTIONS.map(candidate=>[candidate,candidate===action?1:0]))as Record<Action,number>;
 return{action,frame,confidence:1,latency:0,probabilities};
}
