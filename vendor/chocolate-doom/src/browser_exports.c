//
// Browser-only exports for pausing and resuming the Emscripten main loop.
//

#include "config.h"
#include "i_video.h"

#ifdef EMSCRIPTEN

#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE void DB_PauseMainLoop(void)
{
    emscripten_pause_main_loop();
}

EMSCRIPTEN_KEEPALIVE void DB_ResumeMainLoop(void)
{
    emscripten_resume_main_loop();
}

#else

void DB_PauseMainLoop(void)
{
}

void DB_ResumeMainLoop(void)
{
}

#endif
