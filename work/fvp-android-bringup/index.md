---
layout: single
title: "Arm FVP and Android Platform Bring-up"
permalink: /work/fvp-android-bringup/
description: "A May 2026 engineering record of bringing AOSP through Android framework startup on Arm FVP, including ART, services.jar, graphics integration, trace reproducibility, and remaining stabilization work."
author_profile: true
read_time: false
share: false
related: false
---

This page records work to boot an AOSP-based Android platform on Arm Fixed Virtual Platform (FVP). The focus is aligning a modeled board with Android's boot, runtime, service, security, and graphics contracts. Notes span May 3–17, 2026, and summarize observed progress, investigation, and next steps. [The bring-up overview](https://junbenchmarking.tistory.com/1603) and [stabilization plan](https://junbenchmarking.tistory.com/1605) describe the staged approach.

## Scope and method

Bring-up follows explicit boundaries: U-Boot handoff, kernel/init, partition mounts, APEX/linker, Zygote/ART, `system_server` and framework services, then display and apps. For each stage, record the last confirmed signal and next boundary. [The boot-stage summary](https://junbenchmarking.tistory.com/1602) lists the checkpoints; [the board-porting notes](https://junbenchmarking.tistory.com/1595) group recurring issues into APEX/linker, HAL/VINTF, SELinux, and graphics categories.

The investigation spans several layers:

- Early boot: U-Boot, kernel, device tree, memory map, storage, and init.
- Runtime: APEX namespaces, native-library visibility, Zygote, ART, JNI, and optimized framework artifacts.
- Framework and display: `system_server` service startup, HAL and VINTF contracts, SELinux policy, SurfaceFlinger, HWC, gralloc, and DRM.
- Reproducibility: fixed boot inputs, stage markers, and comparisons against a reference environment.

## Boot path and runtime checkpoints

Earlier boot notes record U-Boot loading the kernel, ramdisk, and device tree before handing control to Linux. The associated kernel log review covers early CPU and interrupt setup, memory translation, virtual block storage, and display and input device probing. These are useful signals that the modeled platform is exposing expected components, but each still needs to be checked against the Android image and board configuration. [The early-boot record](https://junbenchmarking.tistory.com/1597) describes those observations.

The Android path then crosses `init`, APEX activation, generated linker namespaces, `app_process64`, Zygote, ART, and the `system_server` fork. In a May 9 log analysis, `com.android.location.provider.jar` followed the `LoadDexFiles()` path because no app image was present, while `services.jar` selected its optimized artifact and reached `OpenImageSpace()` with a non-null app image. This made app-image attachment a focused point for investigation. [The classpath analysis](https://junbenchmarking.tistory.com/1601) records this distinction, and [the APEX/linker review](https://junbenchmarking.tistory.com/1599) explains why a mounted library can still be unavailable to a process in a different linker namespace.

A later May 10 progress note places execution beyond the earlier classpath checkpoint: it records `SystemServer.main()`, loading `android_servers` and registering JNI, then progress through `createSystemContext()`, `SystemServiceManager`, and `startBootstrapServices()` near `FileIntegrityService`. The sequence matters because crossing into framework startup is a separate milestone from reaching the final Android boot phase. [The bring-up progress entry](https://junbenchmarking.tistory.com/1603) provides that dated update.

## Runtime diagnosis and graphics boundary

One recurring diagnostic area was native-library visibility around ICU and APEX namespaces. The notes propose adding markers around `JavaVMExt::LoadNativeLibrary()`, `OpenNativeLibrary()`, symbol lookup, and `JNI_OnLoad()`, with caller and class-loader context to localize failures. [The ICU/JNI analysis](https://junbenchmarking.tistory.com/1594) discusses that instrumentation, alongside the namespace context in [the APEX/linker record](https://junbenchmarking.tistory.com/1599).

Framework startup also depends on board services and display components. A kernel log discussed in the May 9 notes showed the Komeda DRM controller initialized, while generic fbdev emulation setup returned `-12`. Graphics integration across SurfaceFlinger, HWC, gralloc, and display remained open. [The service and graphics analysis](https://junbenchmarking.tistory.com/1601) describes these observations and dependencies. [The stabilization plan](https://junbenchmarking.tistory.com/1605) separates display work from earlier runtime checkpoints.

## Trace repeatability

Alongside bring-up, a separate investigation documents sources of Android application-launch trace variability in preparation for FVP and Cuttlefish experiments. The app itself is only one part of the path: Launcher policy, `system_server`, Zygote and ART state, Binder activity, window and surface setup, RenderThread, SurfaceFlinger, scheduling, storage, and background services can all affect the observed trace. [The trace-variability note](https://junbenchmarking.tistory.com/1593) informs which conditions to control in future experiments.

Comparisons need consistent starting conditions. The documented controls include cold, warm, and hot starts; whether the process was killed; page-cache state; ART profile and `dex2oat` state; first-frame and vsync timing; and scheduler, CPU-frequency, idle, and migration events. These controls make a future comparison interpretable.

## Milestone and remaining work

On May 17, the project log reported a successful FVP boot milestone, with follow-up patches still needed. [The milestone entry](https://junbenchmarking.tistory.com/1606) records the update.

Planned follow-up work includes defining stage-specific success markers, keeping boot inputs and logs reproducible, comparing failures with Cuttlefish or another reference, and turning repeated fixes into categorized board-support checks. The plan also calls for an automated boot harness, log parsers, and a regression workflow. [The stabilization plan](https://junbenchmarking.tistory.com/1605) lists these activities; [the board-porting checklist discussion](https://junbenchmarking.tistory.com/1595) explains the shift from one-off fixes to category-level validation.

## Primary work notes

- [1606 · Boot milestone](https://junbenchmarking.tistory.com/1606)
- [1603 · Bring-up progress](https://junbenchmarking.tistory.com/1603)
- [1601 · Runtime and graphics](https://junbenchmarking.tistory.com/1601)
- [1605 · Stabilization plan](https://junbenchmarking.tistory.com/1605)
- [1593 · Trace variability](https://junbenchmarking.tistory.com/1593)
- [1594 · ICU and JNI](https://junbenchmarking.tistory.com/1594)
- [1595 · Porting checklist](https://junbenchmarking.tistory.com/1595)
- [1597 · Early boot](https://junbenchmarking.tistory.com/1597)
- [1599 · APEX and linker](https://junbenchmarking.tistory.com/1599)
- [1602 · Boot stages](https://junbenchmarking.tistory.com/1602)

[Back to Engineering Work]({{ '/about/#profile-engineering-work' | relative_url }}) · [Home]({{ '/' | relative_url }})
