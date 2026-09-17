export const ACTIONS = ['EXPLORE_WORLD','MOVE_TO_ENEMY','RETREAT_FROM_ENEMY','FACE_ENEMY','FIRE','COLLECT_NEAREST_PICKUP','USE_NEAREST_LINE','IDLE'] as const;
export type Action = typeof ACTIONS[number];
export const AI_ACTIONS = ACTIONS.filter(action=>action!=='IDLE') as Exclude<Action,'IDLE'>[];
export const MOVEMENTS=['HOLD_POSITION','EXPLORE_WORLD','MOVE_TO_ENEMY','RETREAT_FROM_ENEMY','COLLECT_NEAREST_PICKUP','MOVE_TO_USE']as const;
export const VIEWS=['KEEP_HEADING','SCAN','FACE_ENEMY']as const;
export const TRIGGERS=['HOLD_FIRE','FIRE']as const;
export const INTERACTIONS=['NO_USE','USE']as const;
export type ControlFrame={movement:typeof MOVEMENTS[number];view:typeof VIEWS[number];trigger:typeof TRIGGERS[number];interaction:typeof INTERACTIONS[number]};
export type Policy = 'survivalist' | 'berserker';
export interface SpatialEntity {id:number;type:number;x:number;y:number;z:number;vx:number;vy:number;radius:number;height:number;health:number;relative_x:number;relative_y:number;distance:number;relative_angle:number;visible:boolean;enemy:boolean;pickup:boolean;targeting_player:boolean}
export interface MapLine {id:number;x1:number;y1:number;x2:number;y2:number;flags:number;special:number;tag:number;blocking?:boolean}
export interface SpatialWorld {entities:SpatialEntity[];lines:MapLine[]}
export interface CombatState {enemy_detected:boolean;visible_enemy_count:number;fighting_distance:number;aim_tolerance:number;nearest_visible_enemy?:{id:number;type:number;health:number;distance:number;relative_angle:number;aligned:boolean;in_fighting_range:boolean;targeting_player:boolean}}
export interface Observation { player:{health:number;armor:number;weapon:string;ammo:{shells:number;bullets:number};recent_damage:number;under_fire:boolean}; visible_enemies:{id:string;type:string;distance:'near'|'medium'|'far';direction:string;attacking:boolean;threat:'high'|'medium'|'low'}[]; visible_pickups:{id:string;type:string;direction:string;distance:'near'|'medium'|'far';reachable:boolean}[]; navigation:{cover:string[];unexplored_directions:string[];exit_known:boolean;exit_direction:string}; combat?:CombatState; exploration?:{visited_cells:number;current_cell_visits:number;novelty:number}; history:{previous_action:Action;current_intent:string;stuck_probability:number}; policy:string; world?:SpatialWorld; source?:{engine:string;raw_pixels_sent:boolean;spatial_data?:string} }
export interface Decision {action:Action; frame?:ControlFrame; confidence:number; latency:number; fallback?:boolean; probabilities:Record<Action,number>}
declare global { interface Window { __DEMO_READY__?: boolean; __DEMO_COMPLETE__?: boolean; __SPATIAL_SNAPSHOT__?: unknown; __ENGINE_STATES__?: unknown[]; __AI_DEBUG__?: unknown[]; __SPATIAL_ERROR__?: string; advanceDemo?: (dt:number)=>void } }
