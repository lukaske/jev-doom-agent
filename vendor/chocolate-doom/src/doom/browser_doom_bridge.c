// PROMPT FPS browser bridge. GPL-2.0-or-later, like Chocolate Doom.
#include "config.h"
#if defined(__EMSCRIPTEN__)
#include <emscripten.h>
#include <stdio.h>
#include "doomstat.h"
#include "g_game.h"
#include "m_controls.h"
#include "p_local.h"
#include "p_tick.h"
#include "r_main.h"
#include "r_state.h"

extern thinker_t thinkercap;
static char promptfps_state[65536];
static int promptfps_controls;

enum { PF_FORWARD=1, PF_BACK=2, PF_TURN_LEFT=4, PF_TURN_RIGHT=8,
       PF_STRAFE_LEFT=16, PF_STRAFE_RIGHT=32, PF_FIRE=64, PF_USE=128 };

extern void G_PromptFPSSetKey(int key, boolean down);

// Post into this module's native event queue so input cannot leak to another
// Chocolate Doom instance through global browser keyboard listeners.
EMSCRIPTEN_KEEPALIVE void PromptFPS_SetControls(int controls)
{
    const int flags[] = {PF_FORWARD, PF_BACK, PF_TURN_LEFT, PF_TURN_RIGHT,
                         PF_STRAFE_LEFT, PF_STRAFE_RIGHT, PF_FIRE, PF_USE};
    const int keys[] = {key_up, key_down, key_left, key_right,
                        key_strafeleft, key_straferight, key_fire, key_use};
    unsigned int i;
    for (i = 0; i < sizeof(flags) / sizeof(flags[0]); ++i)
    {
        int was_down = (promptfps_controls & flags[i]) != 0;
        int is_down = (controls & flags[i]) != 0;
        if (was_down != is_down) G_PromptFPSSetKey(keys[i], is_down);
    }
    promptfps_controls = controls;
}

EMSCRIPTEN_KEEPALIVE void PromptFPS_SetPaused(int should_pause)
{
    paused = should_pause != 0;
}

static int AddEntity(char *out, size_t size, int n, int first, int id,
                     mobj_t *player, mobj_t *mo)
{
    int dx = (mo->x - player->x) >> FRACBITS;
    int dy = (mo->y - player->y) >> FRACBITS;
    int distance = P_AproxDistance(mo->x - player->x, mo->y - player->y) >> FRACBITS;
    unsigned int bearing = (unsigned int) R_PointToAngle2(player->x, player->y, mo->x, mo->y);
    int relative_angle = (int) (bearing - player->angle);
    return n + snprintf(out + n, size - n,
        "%s{\"id\":%d,\"type\":%d,\"x\":%d,\"y\":%d,\"z\":%d,"
        "\"vx\":%d,\"vy\":%d,\"radius\":%d,\"height\":%d,\"health\":%d,"
        "\"relative_x\":%d,\"relative_y\":%d,\"distance\":%d,"
        "\"relative_angle\":%d,\"visible\":%s,\"enemy\":%s,\"pickup\":%s,"
        "\"targeting_player\":%s}",
        first ? "" : ",", id, mo->type, mo->x >> FRACBITS, mo->y >> FRACBITS,
        mo->z >> FRACBITS, mo->momx >> FRACBITS, mo->momy >> FRACBITS,
        mo->radius >> FRACBITS, mo->height >> FRACBITS, mo->health, dx, dy,
        distance, relative_angle, P_CheckSight(player, mo) ? "true" : "false",
        (mo->flags & MF_COUNTKILL) ? "true" : "false",
        (mo->flags & MF_SPECIAL) ? "true" : "false",
        mo->target == player ? "true" : "false");
}

EMSCRIPTEN_KEEPALIVE const char *PromptFPS_Observation(void)
{
    player_t *p = &players[consoleplayer];
    thinker_t *th;
    int n = 0, enemies = 0, pickups = 0, entities = 0, i;

    if (p->mo == NULL)
    {
        snprintf(promptfps_state, sizeof(promptfps_state), "{\"ready\":false}");
        return promptfps_state;
    }

    n = snprintf(promptfps_state, sizeof(promptfps_state),
        "{\"ready\":true,\"player\":{\"health\":%d,\"armor\":%d,"
        "\"weapon\":%d,\"ammo\":{\"bullets\":%d,\"shells\":%d,"
        "\"rockets\":%d,\"cells\":%d},\"recent_damage\":%d,"
        "\"under_fire\":%s,\"x\":%d,\"y\":%d,\"z\":%d,"
        "\"vx\":%d,\"vy\":%d,\"angle\":%u,\"kills\":%d},"
        "\"engine_state\":{\"gametic\":%d,\"gamestate\":%d,\"paused\":%s,\"controls\":%d},"
        "\"visible_enemies\":[",
        p->mo->health, p->armorpoints, (int) p->readyweapon, p->ammo[am_clip],
        p->ammo[am_shell], p->ammo[am_misl], p->ammo[am_cell], p->damagecount,
        p->damagecount > 0 ? "true" : "false", p->mo->x >> FRACBITS,
        p->mo->y >> FRACBITS, p->mo->z >> FRACBITS, p->mo->momx >> FRACBITS,
        p->mo->momy >> FRACBITS, (unsigned int) p->mo->angle, p->killcount,
        gametic, gamestate, paused ? "true" : "false", promptfps_controls);

    for (th = thinkercap.next; th != &thinkercap && n < (int) sizeof(promptfps_state) - 2048; th = th->next)
    {
        mobj_t *mo;
        int dist;
        if (th->function.acp1 != (actionf_p1) P_MobjThinker) continue;
        mo = (mobj_t *) th;
        if (mo == p->mo || mo->health <= 0 || !(mo->flags & MF_COUNTKILL) || !P_CheckSight(p->mo, mo)) continue;
        dist = P_AproxDistance(mo->x - p->mo->x, mo->y - p->mo->y) >> FRACBITS;
        n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n,
            "%s{\"id\":\"monster_%d\",\"distance_units\":%d,\"health\":%d,"
            "\"x\":%d,\"y\":%d,\"relative_x\":%d,\"relative_y\":%d,"
            "\"attacking\":%s,\"threat\":\"%s\"}", enemies ? "," : "", enemies + 1,
            dist, mo->health, mo->x >> FRACBITS, mo->y >> FRACBITS,
            (mo->x - p->mo->x) >> FRACBITS, (mo->y - p->mo->y) >> FRACBITS,
            mo->target == p->mo ? "true" : "false", dist < 256 ? "high" : (dist < 768 ? "medium" : "low"));
        enemies++;
    }
    n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n, "],\"visible_pickups\":[");
    for (th = thinkercap.next; th != &thinkercap && n < (int) sizeof(promptfps_state) - 2048; th = th->next)
    {
        mobj_t *mo;
        int dist;
        if (th->function.acp1 != (actionf_p1) P_MobjThinker) continue;
        mo = (mobj_t *) th;
        if (!(mo->flags & MF_SPECIAL) || !P_CheckSight(p->mo, mo)) continue;
        dist = P_AproxDistance(mo->x - p->mo->x, mo->y - p->mo->y) >> FRACBITS;
        n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n,
            "%s{\"id\":\"pickup_%d\",\"type\":\"item\",\"distance_units\":%d,"
            "\"x\":%d,\"y\":%d,\"reachable\":true}", pickups ? "," : "", pickups + 1,
            dist, mo->x >> FRACBITS, mo->y >> FRACBITS);
        pickups++;
    }
    n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n, "],\"world\":{\"entities\":[");
    for (th = thinkercap.next; th != &thinkercap && n < (int) sizeof(promptfps_state) - 4096; th = th->next)
    {
        mobj_t *mo;
        if (th->function.acp1 != (actionf_p1) P_MobjThinker) continue;
        mo = (mobj_t *) th;
        if (mo == p->mo) continue;
        n = AddEntity(promptfps_state, sizeof(promptfps_state), n, entities == 0, entities, p->mo, mo);
        ++entities;
    }
    n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n, "],\"lines\":[");
    for (i = 0; i < numlines && n < (int) sizeof(promptfps_state) - 256; ++i)
    {
        line_t *line = &lines[i];
        n += snprintf(promptfps_state + n, sizeof(promptfps_state) - n,
            "%s{\"id\":%d,\"x1\":%d,\"y1\":%d,\"x2\":%d,\"y2\":%d,"
            "\"flags\":%d,\"special\":%d,\"tag\":%d,\"blocking\":%s}", i ? "," : "", i,
            line->v1->x >> FRACBITS, line->v1->y >> FRACBITS, line->v2->x >> FRACBITS,
            line->v2->y >> FRACBITS, line->flags, line->special, line->tag,
            (line->backsector == NULL || (line->flags & ML_BLOCKING)) ? "true" : "false");
    }
    snprintf(promptfps_state + n, sizeof(promptfps_state) - n,
             "]},\"navigation\":{\"exit_known\":false},\"engine\":\"Chocolate Doom 3.1.1\"}");
    return promptfps_state;
}

EMSCRIPTEN_KEEPALIVE void PromptFPS_SetStart(void)
{
    player_t *p;
    mobj_t *enemy;
    static const int offsets[][2] = {
        {224, 0}, {256, 64}, {256, -64}, {320, 0}
    };
    unsigned int i;
    G_InitNew(sk_baby, 1, 1);
    p = &players[consoleplayer];
    if (p->mo == NULL) return;
    p->health = 100; p->mo->health = 100; p->armorpoints = 100;
    p->armortype = 1; p->ammo[am_shell] = 32;
    // Start the experiment in an observable combat situation instead of an
    // empty spawn. This is world setup only; no controller action is scripted.
    for (i = 0; i < sizeof(offsets) / sizeof(offsets[0]); ++i)
    {
        enemy = P_SpawnMobj(p->mo->x + offsets[i][0] * FRACUNIT,
                            p->mo->y + offsets[i][1] * FRACUNIT,
                            ONFLOORZ, MT_TROOP);
        if (enemy != NULL)
        {
            enemy->health = 10;
            enemy->target = p->mo;
            enemy->threshold = 100;
            enemy->reactiontime = 70;
            P_SetMobjState(enemy, enemy->info->seestate);
        }
    }
}
#endif
