---
title: "CUDA PTX vs. SASS: Toolchain and GPU Architecture Decide Whether the Model Runs"
pubDate: 2026-08-13
description: "Why a fresh llama.cpp build still crashed on Blackwell and how native SASS removed the incompatible PTX JIT path."
tags: ["llm", "local-models", "llama.cpp", "cuda", "gpu", "reliability"]
lang: en
source: "field-note"
draft: false
---

## Symptom

The newly released
[`meta-models/Muse-Glimmer-30B`](https://huggingface.co/meta-models/Muse-Glimmer-30B)
(August 9, 2026) crashed while loading in `rms_norm_f32_cuda` even when
llama.cpp was built from master: `muse_glimmer` architecture support had already
landed in [PR #26841](https://github.com/ggml-org/llama.cpp/pull/26841). The log
showed:

```text
CUDA error: the provided PTX was compiled with an unsupported toolchain.
```

At the same time:

- llama.cpp `b9570`, the old Bonsai build, did not even register the
  `muse_glimmer` architecture;
- fresh master at commit `84e908c` recognized the architecture but crashed on
  the first CUDA kernel.

## Context

Hardware:

- RTX 5060 Ti 16 GB - Blackwell, `compute capability 12.0` (`sm_120`);
- RTX 3060 12 GB - Ampere, `compute capability 8.6` (`sm_86`).

Both architectures can be checked in
[NVIDIA's official compute-capability table](https://developer.nvidia.com/cuda/gpus).

The NVIDIA `595.84` driver belongs to the CUDA 13.2 branch. NVIDIA lists
`610.43.02` for CUDA 13.3, but
[minor version compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html)
within the same major version still applies, with restrictions.

Software:

- the system CUDA toolkit from `apt` was the outdated `12.0`;
- the current installed toolkit was `CUDA 13.3` under
  `/usr/local/cuda-13.3`;
- `nvcc` from `PATH` still pointed to 12.0 instead of 13.3.

## Root cause

There were three layers of problems. Each one masked the next.

### 1. CUDA toolkit 12.0 did not fit the current host toolchain

When built with `nvcc 12.0`, the system `stdlib.h` and `wchar.h` headers
contained the `_Float32`, `_Float64`, and `_Float128` types from the current GCC
13 and glibc 2.39 combination, but the old CUDA compiler did not understand
them:

```text
/usr/include/stdlib.h:141:8: error: '_Float32' does not name a type
```

This is not an NVIDIA-supported combination:
[the CUDA 12.0 matrix](https://docs.nvidia.com/cuda/archive/12.0.0/cuda-installation-guide-linux/#system-requirements)
does not include GCC 13 or glibc 2.39.

The fix was to explicitly select `nvcc` from
`/usr/local/cuda-13.3/bin/` and use `gcc-12` as the host compiler:

```bash
cmake -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/gcc-12 \
      -DCMAKE_C_COMPILER=/usr/bin/gcc-12 \
      -DCMAKE_CXX_COMPILER=/usr/bin/g++-12 ...
```

### 2. PDL and `cudaFuncGetAttributes`

After fixing the first layer, the model started loading but crashed in
`ggml_cuda_kernel_can_use_pdl`, which calls `cudaFuncGetAttributes` for every
kernel. With a 13.2 driver and a 13.3 toolkit, the call returned the unsupported
PTX error.

In the llama.cpp commit used here,
[`GGML_CUDA_USE_PDL` was enabled based on the CUDART version](https://github.com/ggml-org/llama.cpp/blob/84e908c/ggml/src/ggml-cuda/common.cuh).
CMake read the `-DGGML_CUDA_NO_PDL` flag, but it did not disable that macro in
`common.cuh`. Manually disabling `GGML_CUDA_USE_PDL` in the source was the only
thing that helped.

This matches NVIDIA's documented restriction:
[PTX compiled by a newer toolkit does not work on an older driver under minor version compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html#application-considerations-for-minor-version-compatibility).

### 3. `CMAKE_CUDA_ARCHITECTURES` did not match the hardware

The RTX 5060 Ti is `sm_120`, while the build targeted `89` for Ada and `86` for
Ampere. The binary had no native cubin for Blackwell, so the driver fell back to
PTX JIT and hit the incompatible PTX toolchain version.

The working set was:

```text
-DCMAKE_CUDA_ARCHITECTURES="120;86"
```

Without suffixes, CMake generates both real and virtual code for the listed
architectures, as documented by
[`CUDA_ARCHITECTURES`](https://cmake.org/cmake/help/latest/prop_tgt/CUDA_ARCHITECTURES.html).
After that, `nvcc` embedded native SASS for Blackwell and Ampere, so these cards
no longer needed PTX JIT.

## Fix

The working build command, with a full rebuild after every `common.cuh` change:

```bash
export PATH=/usr/local/cuda-13.3/bin:$PATH
export CUDACXX=/usr/local/cuda-13.3/bin/nvcc

cmake -B build \
  -DBUILD_SHARED_LIBS=OFF \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES="120;86" \
  -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/gcc-12 \
  -DCMAKE_C_COMPILER=/usr/bin/gcc-12 \
  -DCMAKE_CXX_COMPILER=/usr/bin/g++-12

cmake --build build --config Release -j 8 \
  --target llama-server llama-cli llama-mtmd-cli
```

In addition, the line before `#define GGML_CUDA_USE_PDL` in
`ggml/src/ggml-cuda/common.cuh` was changed from `#if` to `#if 0` to disable
PDL.

The `~/llama.cpp/start-glimmer.sh` startup script:

```bash
export LD_LIBRARY_PATH=/usr/local/cuda-13.3/lib64:${LD_LIBRARY_PATH}

./build/bin/llama-server \
  -m ~/models/glimmer/Muse-Glimmer-30B-KQuant-17GB-Q4_K_M.gguf \
  --mmproj ~/models/glimmer/mmproj-Muse-Glimmer-30B-Q4_K_M.gguf \
  -ngl 99 -c 32768 \
  -a muse-glimmer-30b \
  --host 0.0.0.0 --port 8082 \
  --jinja --temp 1.0 --top-p 0.95 --top-k 64 -np 2
```

## Result

- the model loads and `/health` returns `ok`;
- tensor split: RTX 5060 Ti 11.8 GB / RTX 3060 7.8 GB;
- about 22 tok/s without speculative decoding and about 200 tok/s prompt eval;
- 32K context out of the 131K maximum - VRAM became the limit;
- the DFlash speculative drafter did not start because it requires
  `ctx_other`, which is unavailable in the current memory-fitting mode.

## Lessons

1. Check each card's `compute capability` with
   `nvidia-smi --query-gpu=compute_cap` instead of relying on the GPU name. On
   this machine, the difference between `sm_89` and `sm_120` meant falling back
   to PTX JIT and crashing.

2. The `nvcc` on `PATH` can be much older than the toolkit actually installed.
   Here, `/usr/bin/nvcc` pointed to CUDA 12.0 from `apt` while the current 13.3
   lived under `/usr/local/cuda-13.3/bin`. Set `CUDACXX` explicitly.

3. In this build graph, changing `common.cuh` did not always rebuild every
   dependent object. The patch required removing `build/` and rebuilding from
   scratch; otherwise stale `.o` files remained.

4. [PDL](https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/programmatic-dependent-launch.html)
   is available starting with compute capability 9.0 and can overlap dependent
   kernels. But when a crash occurs in `ggml_cuda_kernel_can_use_pdl` with a
   mismatched toolkit and driver, check PTX compatibility first, then
   temporarily disable PDL.

5. According to the
   [Muse Glimmer model card](https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF),
   KQuant-17GB loses an average of 1.0% across 15 benchmarks, while
   KQuant-Dynamic loses 0.2%. That makes the 16 GB file practical on a 24 GB
   card with room left for the KV cache.

6. When a GPU with a new major compute capability arrives, rebuild the CUDA
   binaries for it. Native cubins are not compatible across major
   architectures, while the PTX JIT fallback depends on toolkit-driver
   compatibility.
