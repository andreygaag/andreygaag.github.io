---
title: "CUDA PTX vs SASS: toolchain и архитектура GPU решают, запустится ли модель"
pubDate: 2026-08-13
description: "Почему свежий llama.cpp всё равно падал на Blackwell и как нативный SASS убрал несовместимый PTX JIT."
tags: ["llm", "local-models", "llama.cpp", "cuda", "gpu", "reliability"]
lang: ru
source: "field-note"
draft: false
---

## Симптом

Свежая модель [`meta-models/Muse-Glimmer-30B`](https://huggingface.co/meta-models/Muse-Glimmer-30B)
(релиз 9 августа 2026) падала при загрузке с крашем в
`rms_norm_f32_cuda`, даже если llama.cpp был собран из master: поддержка
архитектуры `muse_glimmer` уже была влита в
[PR #26841](https://github.com/ggml-org/llama.cpp/pull/26841). Ошибка из лога:

```text
CUDA error: the provided PTX was compiled with an unsupported toolchain.
```

При этом:

- llama.cpp версии `b9570`, старый билд для Bonsai, даже не регистрировал
  архитектуру `muse_glimmer`
- свежий master на коммите `84e908c` архитектуру видел, но крашился на первом
  CUDA-ядре

## Контекст

Железо:

- RTX 5060 Ti 16 GB - Blackwell, `compute capability 12.0` (`sm_120`)
- RTX 3060 12 GB - Ampere, `compute capability 8.6` (`sm_86`)

Обе архитектуры сверяются по
[официальной таблице compute capability NVIDIA](https://developer.nvidia.com/cuda/gpus).

Драйвер NVIDIA `595.84` соответствует ветке CUDA 13.2. Для CUDA 13.3 NVIDIA
указывает драйвер `610.43.02`, но внутри одной major-ветки действует
[minor version compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html)
с ограничениями.

Софт:

- системный CUDA toolkit из `apt` - устаревший `12.0`;
- актуальный установленный toolkit - `CUDA 13.3` в `/usr/local/cuda-13.3`;
- `nvcc` из `PATH` по умолчанию указывал на 12.0, а не на 13.3.

## Корневая причина

Проблем было три слоя. Каждый маскировал следующий.

### 1. CUDA toolkit 12.0 не подходил текущему host toolchain

При сборке с `nvcc 12.0` системные хидеры `stdlib.h` и `wchar.h` содержали типы
`_Float32`, `_Float64` и `_Float128`, которые появились в текущей связке GCC 13
и glibc 2.39, но этот старый CUDA compiler их не понимал:

```text
/usr/include/stdlib.h:141:8: error: '_Float32' does not name a type
```

Это не поддерживаемая NVIDIA комбинация: в
[матрице CUDA 12.0](https://docs.nvidia.com/cuda/archive/12.0.0/cuda-installation-guide-linux/#system-requirements)
нет GCC 13 и glibc 2.39.

Фикс - явно указать `nvcc` из `/usr/local/cuda-13.3/bin/` и host compiler
`gcc-12`:

```bash
cmake -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/gcc-12 \
      -DCMAKE_C_COMPILER=/usr/bin/gcc-12 \
      -DCMAKE_CXX_COMPILER=/usr/bin/g++-12 ...
```

### 2. PDL и `cudaFuncGetAttributes`

После починки первого слоя модель грузилась, но падала в
`ggml_cuda_kernel_can_use_pdl`, который вызывает `cudaFuncGetAttributes` для
каждого ядра. На драйвере 13.2 с toolkit 13.3 этот вызов возвращал ошибку о
неподдерживаемом PTX.

В использованном коммите llama.cpp
[`GGML_CUDA_USE_PDL` включался по версии CUDART](https://github.com/ggml-org/llama.cpp/blob/84e908c/ggml/src/ggml-cuda/common.cuh).
Флаг `-DGGML_CUDA_NO_PDL` читался CMake, но не отключал этот макрос в
`common.cuh`. Помогло только ручное отключение `GGML_CUDA_USE_PDL` в исходнике.

Это согласуется с ограничением NVIDIA:
[PTX, собранный новым toolkit, не работает на старом драйвере в режиме minor compatibility](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html#application-considerations-for-minor-version-compatibility).

### 3. `CMAKE_CUDA_ARCHITECTURES` не соответствовала железу

RTX 5060 Ti - `sm_120`, а сборка шла под `89` для Ada и `86` для Ampere.
Нативного cubin для Blackwell в бинарнике не было, поэтому драйвер переходил к
PTX JIT и упирался в несовместимую версию PTX toolchain.

Рабочий набор:

```text
-DCMAKE_CUDA_ARCHITECTURES="120;86"
```

Без суффиксов CMake генерирует для перечисленных архитектур и real, и virtual
code - это прямо описано в
[`CUDA_ARCHITECTURES`](https://cmake.org/cmake/help/latest/prop_tgt/CUDA_ARCHITECTURES.html).
После этого `nvcc` положил в бинарник нативный SASS для Blackwell и Ampere, и
PTX JIT для этих карт больше не требовался.

## Исправление

Рабочая команда сборки, с полной пересборкой после каждого изменения
`common.cuh`:

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

Дополнительно в `ggml/src/ggml-cuda/common.cuh` строка перед
`#define GGML_CUDA_USE_PDL` была заменена с `#if` на `#if 0`, чтобы отключить
PDL.

Стартовый скрипт `~/llama.cpp/start-glimmer.sh`:

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

## Результат

- модель загружается, `/health` возвращает `ok`;
- tensor split: RTX 5060 Ti 11.8 GB / RTX 3060 7.8 GB;
- около 22 tok/s без speculative decoding, около 200 tok/s prompt eval;
- контекст 32K из максимальных 131K - дальше упёрлись в VRAM;
- DFlash speculative drafter не запустился: ему нужен `ctx_other`, недоступный
  в текущем режиме memory fitting.

## Выводы

1. Проверяй `compute capability` каждой карты через
   `nvidia-smi --query-gpu=compute_cap`, а не по имени GPU. Для этой машины
   различие между `sm_89` и `sm_120` означало переход к PTX JIT и краш.

2. `nvcc` из `PATH` может быть древнее реально установленного toolkit. Здесь
   `/usr/bin/nvcc` указывал на CUDA 12.0 из `apt`, а актуальный 13.3 жил в
   `/usr/local/cuda-13.3/bin`. Поэтому `CUDACXX` лучше задавать явно.

3. В этом build graph изменение `common.cuh` не всегда приводило к пересборке
   всех зависимых объектов. После патча потребовались удаление `build/` и
   чистая пересборка; иначе оставались старые `.o`.

4. [PDL](https://docs.nvidia.com/cuda/cuda-programming-guide/04-special-topics/programmatic-dependent-launch.html)
   доступен начиная с compute capability 9.0 и может перекрывать выполнение
   зависимых ядер. Но если crash происходит в
   `ggml_cuda_kernel_can_use_pdl` на несовместимой связке toolkit и driver,
   сначала надо проверить PTX compatibility, а затем временно отключить PDL.

5. По данным
   [карточки Muse Glimmer](https://huggingface.co/meta-models/Muse-Glimmer-30B-GGUF),
   KQuant-17GB теряет в среднем 1.0% на 15 бенчмарках, а KQuant-Dynamic - 0.2%.
   Это делает 16 GB файл практичным для 24 GB карты с запасом под KV-кэш.

6. Когда появляется GPU с новой major compute capability, пересобирай под неё
   CUDA-бинарники. Нативные cubin несовместимы между major-архитектурами, а
   fallback на PTX JIT зависит от совместимости toolkit и драйвера.
