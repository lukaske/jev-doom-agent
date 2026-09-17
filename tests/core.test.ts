import {describe,it,expect} from 'vitest';
import {ACTIONS,type Observation} from '../src/types';
import {detectCombat,type EngineObservation} from '../src/doom';
import {offlineDecision,validAction} from '../src/policy';
import {parseDecision} from '../server/typesafe';

const observation={player:{health:100,armor:0,weapon:'pistol',ammo:{shells:0,bullets:50},recent_damage:0,under_fire:false},visible_enemies:[],visible_pickups:[],navigation:{cover:[],unexplored_directions:[],exit_known:false,exit_direction:'unknown'},history:{previous_action:'IDLE',current_intent:'',stuck_probability:0},policy:''}as Observation;
const enemy={id:1,type:1,x:1,y:1,z:0,vx:0,vy:0,radius:20,height:56,health:100,relative_x:1,relative_y:1,distance:100,relative_angle:0,visible:true,enemy:true,pickup:false,targeting_player:true};

describe('AI controls',()=>{
  it('exposes independent primitive actions',()=>{
    expect(ACTIONS).toEqual(['EXPLORE_WORLD','MOVE_TO_ENEMY','RETREAT_FROM_ENEMY','FACE_ENEMY','FIRE','COLLECT_NEAREST_PICKUP','USE_NEAREST_LINE','IDLE']);
    expect(validAction('FIRE')).true;
  });
  it('explores without enemies and fights when an enemy exists',()=>{
    observation.world={entities:[],lines:[]};
    expect(offlineDecision(observation,'survivalist').action).toBe('EXPLORE_WORLD');
    observation.world.entities.push(enemy);
    expect(offlineDecision(observation,'berserker').frame).toEqual({movement:'HOLD_POSITION',view:'FACE_ENEMY',trigger:'FIRE',interaction:'NO_USE'});
  });
  it('abstracts fighting distance and alignment for the model',()=>{
    const combat=detectCombat({ready:true,world:{entities:[enemy],lines:[]}}as EngineObservation);
    expect(combat.nearest_visible_enemy).toMatchObject({in_fighting_range:true,aligned:true,targeting_player:true});
  });
  it('accepts a composable frame from the AI',()=>expect(parseDecision({answers:{movement:{type:'choice',choice:'HOLD_POSITION',confidence:.9,probabilities:{HOLD_POSITION:1}},view:{type:'choice',choice:'FACE_ENEMY',confidence:.8,probabilities:{FACE_ENEMY:1}},trigger:{type:'choice',choice:'FIRE',confidence:.7,probabilities:{FIRE:1}},interaction:{type:'choice',choice:'NO_USE',confidence:.9,probabilities:{NO_USE:1}}}})).toMatchObject({action:'FIRE',confidence:.7,frame:{movement:'HOLD_POSITION',view:'FACE_ENEMY',trigger:'FIRE',interaction:'NO_USE'}}));
});
