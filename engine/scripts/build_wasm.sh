#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENGINE_ROOT="${PROJECT_ROOT}/vendor/chocolate-doom"
ASSET_ROOT="${PROJECT_ROOT}/public/iwads"
BUILD_ROOT="${PROJECT_ROOT}/engine/build/wasm"
OUTPUT_ROOT="${PROJECT_ROOT}/public/engine"
TOOLING_BIN="${PROJECT_ROOT}/.tooling/bin"
TOOLING_SITE_PACKAGES="$(find "${PROJECT_ROOT}/.tooling/lib" -maxdepth 3 -type d -name site-packages 2>/dev/null | head -n 1 || true)"
LOCAL_EMSDK_ENV="${PROJECT_ROOT}/.emsdk/emsdk_env.sh"
DEFAULT_WAD="${ASSET_ROOT}/freedoom2.wad"

detect_jobs() {
  if command -v sysctl >/dev/null 2>&1; then
    local sysctl_jobs

    sysctl_jobs="$(sysctl -n hw.ncpu 2>/dev/null || true)"

    if [ -n "${sysctl_jobs}" ]; then
      echo "${sysctl_jobs}"
      return
    fi
  fi

  if command -v nproc >/dev/null 2>&1; then
    nproc
    return
  fi

  echo 4
}

if [ -d "${TOOLING_BIN}" ]; then
  export PATH="${TOOLING_BIN}:${PATH}"
fi

if [ -n "${TOOLING_SITE_PACKAGES}" ]; then
  export PYTHONPATH="${TOOLING_SITE_PACKAGES}${PYTHONPATH:+:${PYTHONPATH}}"
fi

if ! command -v emcc >/dev/null 2>&1 && [ -f "${LOCAL_EMSDK_ENV}" ]; then
  # shellcheck disable=SC1090
  source "${LOCAL_EMSDK_ENV}" >/dev/null
fi

if ! command -v emcc >/dev/null 2>&1; then
  cat <<EOF
Emscripten was not found.

Install emsdk from the repository root:
  git clone https://github.com/emscripten-core/emsdk.git .emsdk
  cd .emsdk
  ./emsdk install 4.0.14
  ./emsdk activate 4.0.14
  source ./emsdk_env.sh
  cd ..

Install local build tools:
  python3 -m pip install --upgrade --prefix ./.tooling cmake ninja
  export PATH="\$PWD/.tooling/bin:\$PATH"
  export PYTHONPATH="\$(find "\$PWD/.tooling/lib" -maxdepth 3 -type d -name site-packages | head -n 1)"

Then rebuild the engine:
  npm run build:wasm
EOF
  exit 1
fi

if ! command -v cmake >/dev/null 2>&1; then
  cat <<EOF
cmake was not found on PATH.

Install local build tools from the repository root:
  python3 -m pip install --upgrade --prefix ./.tooling cmake ninja
  export PATH="\$PWD/.tooling/bin:\$PATH"
  export PYTHONPATH="\$(find "\$PWD/.tooling/lib" -maxdepth 3 -type d -name site-packages | head -n 1)"

Then rerun:
  npm run build:wasm
EOF
  exit 1
fi

if [ ! -f "${DEFAULT_WAD}" ]; then
  echo "Missing default IWAD: ${DEFAULT_WAD}" >&2
  exit 1
fi

mkdir -p "${BUILD_ROOT}" "${OUTPUT_ROOT}"

EM_LINK_FLAGS="-sALLOW_MEMORY_GROWTH=1 -sGLOBAL_BASE=131072 --preload-file ${DEFAULT_WAD}@/iwads/freedoom2.wad"

emcmake cmake --fresh \
  -S "${ENGINE_ROOT}" \
  -B "${BUILD_ROOT}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_EXECUTABLE_SUFFIX=.js \
  -DENABLE_SDL2_MIXER=OFF \
  -DENABLE_SDL2_NET=OFF \
  "-DCMAKE_EXE_LINKER_FLAGS=${EM_LINK_FLAGS}"

cmake --build "${BUILD_ROOT}" --target chocolate-doom --parallel "$(detect_jobs)"

ENGINE_JS="$(find "${BUILD_ROOT}" -maxdepth 3 -name 'chocolate-doom.js' | head -n 1)"

if [ -z "${ENGINE_JS}" ]; then
  echo "Unable to locate chocolate-doom.js under ${BUILD_ROOT}" >&2
  exit 1
fi

ENGINE_DIR="$(dirname "${ENGINE_JS}")"

cp "${ENGINE_DIR}/chocolate-doom.js" "${OUTPUT_ROOT}/"
cp "${ENGINE_DIR}/chocolate-doom.wasm" "${OUTPUT_ROOT}/"
cp "${ENGINE_DIR}/chocolate-doom.data" "${OUTPUT_ROOT}/"

echo "WASM build complete:"
echo "  ${OUTPUT_ROOT}/chocolate-doom.js"
echo "  ${OUTPUT_ROOT}/chocolate-doom.wasm"
echo "  ${OUTPUT_ROOT}/chocolate-doom.data"
