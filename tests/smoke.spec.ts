import {expect,test} from '@playwright/test';

test('single easy game loads a dense enemy spawn and essential controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/compare');
 await expect.poll(()=>page.evaluate(()=>window.__DEMO_READY__),{timeout:30_000}).toBe(true);
 await expect(page.locator('canvas')).toHaveCount(1);
 await expect(page.locator('.control-pad button')).toHaveCount(4);
 await expect(page.locator('.api-console')).toHaveCount(1);
 await expect(page.locator('.api-console pre')).toHaveCSS('overflow','auto');
 const enemies=await page.evaluate(()=>((window.__ENGINE_STATES__?.[0]as any)?.world.entities??[]).filter((entity:any)=>entity.enemy&&entity.health>0).length);
 expect(enemies).toBeGreaterThanOrEqual(1);
 const weakEnemies=await page.evaluate(()=>((window.__ENGINE_STATES__?.[0]as any)?.world.entities??[]).filter((entity:any)=>entity.enemy&&entity.health>0&&entity.health<=10).length);
 expect(weakEnemies).toBe(1);
 const player=await page.evaluate(()=>(window.__ENGINE_STATES__?.[0]as any)?.player);
 expect(player).toMatchObject({health:100,armor:100});
 expect(player.ammo.shells).toBeGreaterThanOrEqual(32);
 const tickBefore=await page.evaluate(()=>(window.__ENGINE_STATES__?.[0]as any)?.engine_state.gametic);
 await page.waitForTimeout(500);
 const tickWhileWaiting=await page.evaluate(()=>(window.__ENGINE_STATES__?.[0]as any)?.engine_state.gametic);
 expect(tickWhileWaiting).toBe(tickBefore);
 await page.getByRole('button',{name:'RUN',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>(window.__ENGINE_STATES__?.[0]as any)?.engine_state.gametic)).toBeGreaterThan(tickBefore);
 const ammo=()=>page.evaluate(()=>Object.values((window.__ENGINE_STATES__?.[0]as any).player.ammo).reduce((sum:number,value:any)=>sum+value,0));
 const before=await ammo();
 for(let step=0;step<8&&(await ammo())===before;step++){await page.locator('[data-control="SHOOT"]').click();await page.waitForTimeout(350)}
 expect(await ammo()).toBeLessThan(before);
 expect(errors).toEqual([]);
});

test('API decisions stream into the adjacent console',async({page})=>{
 await page.route('**/api/key',route=>route.fulfill({json:{configured:true}}));
 await page.route('**/api/decision',route=>route.fulfill({json:{action:'FIRE',frame:{movement:'HOLD_POSITION',view:'FACE_ENEMY',trigger:'FIRE',interaction:'NO_USE'},confidence:1,latency:1,probabilities:{FIRE:1}}}));
 await page.goto('/compare');
 await expect.poll(()=>page.evaluate(()=>window.__DEMO_READY__),{timeout:30_000}).toBe(true);
 await page.getByRole('button',{name:'RUN',exact:true}).click();
 await expect(page.locator('.api-console pre')).toContainText('API RESPONSE',{timeout:5_000});
 await expect(page.locator('.api-console pre')).toContainText('"trigger": "FIRE"');
 await expect(page.locator('.decision b')).toHaveText('HOLD POSITION + FACE ENEMY + FIRE');
});
