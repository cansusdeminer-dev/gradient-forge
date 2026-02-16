# TextureSynth — Master Orchestration & Build Plan
### *The Modular Visual Synthesizer for Procedural Realms*
#### Version 1.0 · February 2026 · Browser/React Three Fiber

---

## Table of Contents

1. [Philosophy & Guiding Constraints](#1-philosophy--guiding-constraints)
2. [Technical Stack Decision Matrix](#2-technical-stack-decision-matrix)
3. [Architecture Deep-Dive](#3-architecture-deep-dive)
4. [Phase 0: Foundation Sprint (Weeks 1–3)](#phase-0-foundation-sprint-weeks-13)
5. [Phase 1: The Patchbay Core (Weeks 4–8)](#phase-1-the-patchbay-core-weeks-48)
6. [Phase 2: Module Ecosystem v1 (Weeks 9–14)](#phase-2-module-ecosystem-v1-weeks-914)
7. [Phase 3: The Render Pipeline (Weeks 15–20)](#phase-3-the-render-pipeline-weeks-1520)
8. [Phase 4: 3D Volumes & Raymarch (Weeks 21–26)](#phase-4-3d-volumes--raymarch-weeks-2126)
9. [Phase 5: The Analog Soul (Weeks 27–30)](#phase-5-the-analog-soul-weeks-2730)
10. [Phase 6: AI Co-Pilot (Weeks 31–34)](#phase-6-ai-co-pilot-weeks-3134)
11. [Phase 7: Sync, Collab & Export (Weeks 35–38)](#phase-7-sync-collab--export-weeks-3538)
12. [Phase 8: Polish, Perf & Launch (Weeks 39–42)](#phase-8-polish-perf--launch-weeks-3942)
13. [Module Build Order & Dependency Graph](#module-build-order--dependency-graph)
14. [Shader Compilation Strategy](#shader-compilation-strategy)
15. [State Management Architecture](#state-management-architecture)
16. [Testing & QA Strategy](#testing--qa-strategy)
17. [Risk Registry & Mitigations](#risk-registry--mitigations)
18. [Team Roles & Hiring Plan](#team-roles--hiring-plan)
19. [File/Folder Structure](#filefolder-structure)
20. [Definition of Done per Phase](#definition-of-done-per-phase)

---

## 1. Philosophy & Guiding Constraints

### Core Principle
> Every architectural decision answers: **"Does this make the patch cable feel alive?"**

### Non-Negotiable Constraints
| # | Constraint | Rationale |
|---|-----------|-----------|
| C1 | **Browser-first** — must run in Chrome/Edge/Safari with zero install | Lowest friction for adoption; Electron wraps later |
| C2 | **60fps at 1080p** on mid-tier GPU (GTX 1060 / M1 integrated) | Visual synth is useless if it stutters |
| C3 | **Patches are JSON** — always serializable, always re-patchable | Portability, undo/redo, collab, marketplace |
| C4 | **One shader per render target** — node graph compiles to monolithic GLSL | Avoids multi-pass overhead; one draw call per output |
| C5 | **Analog imperfection is a feature** — drift/jitter baked into every module | Soul. This is what makes us not-Substance-Designer |
| C6 | **Module SDK from Day 1** — internal modules use the same API as community | Forces clean boundaries; dogfooding the SDK |

### Design Language
- **Dark nebula palette**: `#0a0a12` bg, `#1a1a2e` panels, neon accent cables
- **Typography**: JetBrains Mono (code/values), Inter (labels)
- **Motion**: 200ms easeOut for knobs, 16ms cable physics, spring-damped zoom
- **Audio metaphor everywhere**: "Voltage" not "value", "patch" not "project", "jam" not "edit"

---

## 2. Technical Stack Decision Matrix

### Chosen Stack
| Layer | Technology | Why This, Not That |
|-------|-----------|-------------------|
| **Framework** | React 19 + Vite 6 | RSC not needed; Vite's HMR critical for shader dev |
| **3D Engine** | React Three Fiber (R3F) + Three.js r170+ | Declarative scene graph; massive ecosystem; custom shaderMaterial |
| **Node Graph** | **Custom fork of ReactFlow v12** | LiteGraph lacks React integration; Rete.js too opinionated. ReactFlow gives us canvas, zoom, edge rendering — we own the node chrome |
| **State** | Zustand v5 + Immer middleware | Minimal boilerplate; subscriptions for per-module re-render isolation |
| **Shader Compile** | Custom **Graph-to-GLSL Transpiler** | No existing tool does this well. We build a DAG walker that emits GLSL functions |
| **GPU Compute** | WebGPU (with WebGL2 fallback) | Compute shaders for flow advection, FFT; fallback ensures reach |
| **Audio/MIDI** | Web Audio API + WebMIDI API | Native browser; no deps |
| **AI** | ONNX Runtime Web (not TF.js) | Smaller bundle, faster inference, WASM+WebGPU backends |
| **Collab** | Yjs + WebRTC (y-webrtc) | CRDT-based; no server for p2p jams |
| **Styling** | Tailwind CSS v4 + CSS Modules for module skins | Utility for layout; CSS Modules for encapsulated module themes |
| **Testing** | Vitest + Playwright + custom shader diff | Unit/integration/visual regression |
| **Build/Deploy** | Vite → Cloudflare Pages (edge) | Fast global CDN; Workers for AI inference edge cache |

### Rejected Alternatives (with reasoning)
- **Unity/Unreal WebGL export**: Too heavy, no hot-reload, shader authoring nightmare
- **Svelte/SvelteKit**: Smaller ecosystem for 3D; R3F is the killer feature
- **Babylon.js**: Node material editor exists but is too game-engine-coupled
- **LiteGraph.js**: Great for vanilla JS but doesn't compose with React rendering model
- **Redux**: Too much boilerplate for the subscription model we need (per-knob updates)

---

## 3. Architecture Deep-Dive

### 3.1 — System Diagram (Conceptual Layers)

```
┌─────────────────────────────────────────────────────────┐
│                    UI LAYER (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ PatchBay │  │ Module   │  │ Preview  │  │ Prompt │  │
│  │ (ReactFlow)│ │ Chrome  │  │ Viewports│  │ Bay    │  │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│        │            │             │             │        │
├────────┴────────────┴─────────────┴─────────────┴────────┤
│                 STATE LAYER (Zustand)                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ PatchStore: { nodes, edges, params, compiled_glsl } │ │
│  │ UIStore: { zoom, selection, theme, perf_metrics }   │ │
│  │ AIStore: { suggestions, history, model_state }      │ │
│  └──────────────────────┬──────────────────────────────┘ │
├─────────────────────────┴────────────────────────────────┤
│              COMPILE LAYER (Web Workers)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Graph Walker │→ │ GLSL Emitter │→ │ Shader Cache  │  │
│  │ (DAG topoSort)│ │ (AST→string) │  │ (hash→program)│  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
├──────────────────────────────────────────────────────────┤
│                RENDER LAYER (R3F / Three.js)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ 2D Quad  │  │ 3D Volume│  │ Post FX  │  │ Export │  │
│  │ (plane+  │  │ (raymarch│  │ (EffectC │  │ (GLTF/ │  │
│  │ shader)  │  │  cube)   │  │  omposer)│  │  EXR)  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
├──────────────────────────────────────────────────────────┤
│               INTEGRATION LAYER                          │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────────────┐  │
│  │ WebMIDI│  │ OSC/WS │  │ Yjs    │  │ ONNX Runtime │  │
│  │ Input  │  │ Bridge │  │ Collab │  │ AI Inference │  │
│  └────────┘  └────────┘  └────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 3.2 — The Patch Graph Data Model

```typescript
// Core type definitions — EVERYTHING flows from this

interface PatchDocument {
  id: string;                    // UUID
  version: number;               // Schema version for migrations
  meta: PatchMeta;
  nodes: Record<NodeID, PatchNode>;
  edges: PatchEdge[];
  macros: MacroBinding[];        // Macro knob → param mappings
  timeline?: TimelineData;       // Animation keyframes
  compiled?: CompiledShader;     // Cached GLSL output
}

interface PatchNode {
  id: NodeID;
  type: ModuleTypeID;            // e.g., "perlin-vco", "flow-advect"
  position: { x: number; y: number };
  params: Record<ParamID, ParamValue>;  // Knob states
  overrides: Record<ParamID, OverrideSource>; // CV inputs override knobs
  bypass: boolean;
  solo: boolean;
}

interface PatchEdge {
  id: EdgeID;
  source: { node: NodeID; port: PortID };
  target: { node: NodeID; port: PortID };
  signalType: SignalType;        // 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D'
  gain: number;                  // Cable attenuation (0–2, default 1)
  color?: string;                // Visual override
}

type SignalType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D' | 'samplerCube';
```

### 3.3 — Graph-to-GLSL Compilation Pipeline

This is the **single hardest technical challenge**. Here's the algorithm:

```
1. TOPOLOGICAL SORT the node graph (Kahn's algorithm)
2. For each node in topo order:
   a. RESOLVE INPUTS: For each input port, look up the connected edge's source output.
      - If connected: reference the source node's output variable name
      - If unconnected: use the knob's current value as a constant
   b. EMIT GLSL FUNCTION: Each module type has a GLSL template with {{placeholders}}
      - e.g., PerlinVCO emits: `float node_{{id}}_density = fbm(uv * {{freq}}, {{octaves}}, {{lacunarity}});`
   c. TYPE COERCE: If edge connects float→vec3, auto-wrap: `vec3(val, val, val)`
3. CONCATENATE all emitted code into a single fragment shader
4. PREPEND common headers (uniforms, noise lib, util funcs)
5. HASH the final string → check cache → compile only if new
6. UPLOAD to GPU as ShaderMaterial uniform update
```

**Critical optimization**: Only recompile when the graph *topology* changes (add/remove node/edge). When a *knob* changes, just update the uniform — zero recompile.

### 3.4 — Module SDK Interface

```typescript
// Every module (internal + community) implements this

interface ModuleDefinition {
  id: ModuleTypeID;
  name: string;
  category: 'generator' | 'modifier' | 'synthesizer' | 'fx' | 'volume' | 'utility';
  description: string;
  tags: string[];
  
  params: ParamDefinition[];      // Knobs, switches, dropdowns
  inputs: PortDefinition[];       // Input jacks
  outputs: PortDefinition[];      // Output jacks
  
  // GLSL template — the core of the module's behavior
  glslTemplate: string;           // With {{param}}, {{input}} placeholders
  
  // Optional: JS-side processing (for non-GPU ops like FFT)
  process?: (inputs: InputValues, params: ParamValues) => OutputValues;
  
  // UI customization
  ui?: {
    width?: number;               // Grid units (default: 2)
    height?: number;
    skin?: string;                // CSS class for custom look
    preview?: 'waveform' | '2d' | '3d' | 'none';
  };
}

interface ParamDefinition {
  id: ParamID;
  label: string;
  type: 'knob' | 'switch' | 'dropdown' | 'xy-pad' | 'color';
  default: number | string | [number, number];
  min?: number;
  max?: number;
  step?: number;
  curve?: 'linear' | 'exponential' | 'logarithmic'; // Knob response curve
  modulatable: boolean;            // Can receive CV input?
  glslUniform: string;             // Maps to uniform name in template
}

interface PortDefinition {
  id: PortID;
  label: string;
  signalType: SignalType;
  glslVariable: string;            // Variable name in template
}
```

---

## Phase 0: Foundation Sprint (Weeks 1–3)

> **Goal**: Empty app runs, node graph renders, one dummy node drags, state persists in memory. Zero visual output yet — just the skeleton.

### Week 1: Project Bootstrap
| Task | Owner | Details | DoD |
|------|-------|---------|-----|
| **P0-1** Init repo | Lead | `pnpm create vite@latest texturesynth --template react-ts`; Monorepo with pnpm workspaces: `packages/core`, `packages/modules`, `packages/ui`, `packages/glsl-compiler`, `apps/web` | `pnpm dev` shows blank page |
| **P0-2** Tailwind + theme | UI | Install Tailwind v4; define CSS custom props: `--ts-bg`, `--ts-panel`, `--ts-accent-*` (6 cable colors); dark theme only for now | Theme tokens render |
| **P0-3** Zustand stores | Core | Create `usePatchStore` (nodes, edges, params) and `useUIStore` (zoom, selection) with Immer middleware. Include `addNode`, `removeNode`, `addEdge`, `updateParam` actions | Unit tests pass (Vitest) |
| **P0-4** React Flow integration | Core | Install `@xyflow/react` v12. Wrap in `<PatchBayCanvas>` component. Custom node type `<ModuleShell>` renders a dark card with title + placeholder knobs | One dummy node drags on canvas |
| **P0-5** ESLint/Prettier/Husky | Lead | Strict TS config (`strict: true`, `noUncheckedIndexedAccess`); pre-commit hooks | CI lint passes |

### Week 2: Module Shell & Ports
| Task | Owner | Details | DoD |
|------|-------|---------|-----|
| **P0-6** Port system | Core | `<InputPort>` and `<OutputPort>` components. Render as colored circles on module edges. Typing: color = signal type (float=cyan, vec3=magenta, sampler=gold) | Ports render on dummy node |
| **P0-7** Cable rendering | UI | Custom ReactFlow edge component: `<PatchCable>`. Cubic bezier, animated dash pattern (`stroke-dashoffset` animation), color inherits from source port type | Cable connects two dummy nodes visually |
| **P0-8** Knob component v1 | UI | `<RotaryKnob>`: SVG arc, drag-to-rotate (vertical drag = value change). Props: `min, max, value, onChange, label, color`. Render value as text below | Knob drags smoothly, calls onChange |
| **P0-9** Module registry | Core | `ModuleRegistry` class: `register(def: ModuleDefinition)`, `get(id)`, `listByCategory()`. Singleton, imported everywhere | Registry holds 1 dummy module |
| **P0-10** Patch serialization | Core | `serializePatch(): PatchDocument` from Zustand state; `loadPatch(doc)` hydrates state. Round-trip test | JSON export → reimport identical |

### Week 3: Dev Tooling & Infra
| Task | Owner | Details | DoD |
|------|-------|---------|-----|
| **P0-11** Shader playground | GLSL | Standalone route `/dev/shader` — raw GLSL editor (CodeMirror 6) + fullscreen `<mesh><planeGeometry/><shaderMaterial/></mesh>` preview. For rapid shader iteration | Edit GLSL → live preview updates |
| **P0-12** Perf overlay | Core | `<PerfMonitor>`: FPS counter, draw calls, shader compile count. Toggle with backtick key. Uses `drei`'s `<Stats>` + custom metrics from Zustand | Overlay visible, FPS reads correctly |
| **P0-13** CI/CD pipeline | DevOps | GitHub Actions: lint → test → build → deploy to Cloudflare Pages (preview per PR, prod on main) | PR deploys preview URL |
| **P0-14** Storybook for UI atoms | UI | `@storybook/react-vite` — stories for `<RotaryKnob>`, `<PatchCable>`, `<InputPort>`, `<OutputPort>`, `<ModuleShell>` | `pnpm storybook` renders all |
| **P0-15** Error boundary + logging | Core | Global React error boundary; structured console logging with levels; Sentry integration stub | Errors caught, logged |

### Phase 0 Exit Criteria
- [ ] App loads in <2s on broadband
- [ ] One dummy module on canvas, draggable, with 4 knobs that rotate
- [ ] Two dummy modules can be connected with a cable
- [ ] Patch exports to JSON and reimports identically
- [ ] CI/CD deploys automatically
- [ ] Storybook documents all base components

---

## Phase 1: The Patchbay Core (Weeks 4–8)

> **Goal**: Fully functional node graph with real cable physics, type checking, undo/redo, and the GLSL compilation pipeline producing actual shader output on a 2D preview quad.

### Sprint 1.1 — Graph Engine (Weeks 4–5)
| Task | ID | Details | Depends On |
|------|----|---------|------------|
| Topological sort engine | **P1-1** | `topoSort(nodes, edges): NodeID[]` — Kahn's algorithm. Cycle detection throws `CycleError` with involved node IDs. Unit test: 50-node random DAGs | P0-3 |
| Type checker | **P1-2** | On edge creation: validate `source.signalType` compatible with `target.signalType`. Compatibility matrix: float→anything (auto-promote), vec3↔vec4 (swizzle), sampler→sampler only. Show red flash on invalid | P0-7 |
| Auto-type coercion GLSL | **P1-3** | When types don't match but are compatible, emit coercion code: `float→vec3` = `vec3(v)`, `vec3→float` = `dot(v, vec3(0.299,0.587,0.114))` (luminance), `vec3→vec4` = `vec4(v, 1.0)` | P1-2 |
| Cable physics | **P1-4** | Replace static bezier with spring simulation (Verlet integration, 8 control points). Cables sag under gravity, sway on drag. 60fps via `requestAnimationFrame` outside React render | P0-7 |
| Multi-select & group | **P1-5** | Shift-click multi-select, Cmd+G to group. Groups rendered as translucent bounding box. Group drag moves all contained nodes | P0-4 |

### Sprint 1.2 — GLSL Compiler v1 (Weeks 6–7)
| Task | ID | Details | Depends On |
|------|----|---------|------------|
| GLSL template parser | **P1-6** | Parse `{{placeholder}}` syntax in module GLSL templates. Replace with resolved variable names or uniform references. Output: string[] of GLSL lines per node | P0-9, P1-1 |
| Uniform extraction | **P1-7** | Walk all unconnected params → emit as `uniform float u_{{nodeId}}_{{paramId}};`. Connected params become local variables, not uniforms | P1-6 |
| Shader assembler | **P1-8** | Concatenate: `#version 300 es` header → precision → uniforms → noise library (prebuilt) → node functions (topo order) → main() with final output assignment | P1-6, P1-7 |
| Noise GLSL library | **P1-9** | Prebuilt `noise_lib.glsl`: Perlin 2D/3D, simplex 2D/3D, Voronoi, value noise, FBM wrapper, curl noise. Adapted from Ashima/webgl-noise with MIT license | None |
| Compile-on-topology-change | **P1-10** | `usePatchStore.subscribe()` on nodes/edges arrays. Debounce 100ms. Run compiler in Web Worker (`compiler.worker.ts`). Post compiled GLSL string back. Hash-based cache: skip if hash matches | P1-8 |
| Uniform-on-knob-change | **P1-11** | `usePatchStore.subscribe()` on params. On change, directly update `shaderMaterial.uniforms[name].value` via R3F ref — NO recompile. Must be <1ms | P1-7 |

### Sprint 1.3 — 2D Preview & Undo (Week 8)
| Task | ID | Details | Depends On |
|------|----|---------|------------|
| 2D render quad | **P1-12** | `<PreviewViewport2D>`: R3F `<Canvas>` with orthographic camera, fullscreen `<Plane>` with compiled `<shaderMaterial>`. Uniforms piped from Zustand | P1-8 |
| Time uniform | **P1-13** | `u_time` (seconds since load), `u_resolution` (viewport px), `u_mouse` (normalized coords) — auto-injected into every compiled shader | P1-12 |
| Undo/Redo | **P1-14** | Zustand middleware: command stack (max 200). Each `addNode/removeNode/addEdge/removeEdge/updateParam` pushes inverse command. Ctrl+Z / Ctrl+Shift+Z | P0-3 |
| Mini-preview per module | **P1-15** | Each `<ModuleShell>` has a 64x64 WebGL canvas showing its output in isolation (render the subgraph up to that node). Throttle to 15fps to save GPU | P1-12 |
| Keyboard shortcuts | **P1-16** | `Space` = add module menu, `Delete` = remove selected, `D` = duplicate, `B` = bypass toggle, `Tab` = cycle selection. Cheat sheet overlay on `?` | P1-5 |

### Phase 1 Exit Criteria
- [ ] Connect 5+ modules, see compiled shader render in 2D preview
- [ ] Knob twist updates output in <16ms (one frame)
- [ ] Graph topology change recompiles in <200ms (for 20 nodes)
- [ ] Cables have spring physics, sag realistically
- [ ] Undo/redo works across all operations
- [ ] Type checking prevents invalid connections with visual feedback

---

## Phase 2: Module Ecosystem v1 (Weeks 9–14)

> **Goal**: Build the first 20 modules — the "essential rack." Each module is a self-contained `ModuleDefinition` using the SDK from Phase 0.

### Module Build Order (Dependency-Driven)

Modules are built in waves — later modules depend on patterns established by earlier ones.

#### Wave 1: Generators (Weeks 9–10)
| Module | ID | GLSL Core | Knobs | Priority | Notes |
|--------|----|-----------|-------|----------|-------|
| **Perlin VCO** | `perlin-vco` | `fbm(uv * freq, octaves, lacunarity, gain)` | Frequency, Octaves, Lacunarity, Gain, Seed | 🔴 P0 | The "hello world" — must be perfect. Seed adds Gaussian jitter for analog feel |
| **Voronoi Cells** | `voronoi-cells` | `voronoi(uv * density, jitter)` with selectable distance (Euclidean, Manhattan, Chebyshev) | Density, Jitter, Distance Mode (dropdown), Edge Width | 🔴 P0 | Outputs: cell color, edge mask, cell ID |
| **Value Noise** | `value-noise` | Interpolated lattice noise | Frequency, Amplitude, Layers | 🟡 P1 | Simpler than Perlin; good for fast base |
| **Simplex Noise** | `simplex-noise` | Simplex gradient noise 2D/3D | Frequency, Amplitude, Seed | 🟡 P1 | Less directional artifacts than Perlin |
| **Gradient Generator** | `gradient-gen` | `mix(colorA, colorB, ramp(uv.x, curve))` | Color A, Color B, Angle, Curve (lin/exp/sin), Midpoint | 🔴 P0 | Foundational — feeds everything |
| **UV Source** | `uv-source` | `gl_FragCoord.xy / u_resolution` with transforms | Scale X, Scale Y, Offset X, Offset Y, Rotation | 🔴 P0 | Every chain starts here or with noise |

#### Wave 2: Modifiers (Weeks 11–12)
| Module | ID | GLSL Core | Knobs | Priority |
|--------|----|-----------|-------|----------|
| **Bezier Warp** | `bezier-warp` | Remap UV through cubic bezier control points | Tension, Segments, Amplitude, Phase | 🔴 P0 |
| **Flow Advect** | `flow-advect` | Euler/RK4 integration of UV along vector field | Strength, Iterations, Damping, Vorticity | 🔴 P0 |
| **Domain Warp** | `domain-warp` | `fbm(uv + fbm(uv + fbm(uv)))` recursive distortion | Warp Amount, Layers, Frequency | 🔴 P0 |
| **Fractal Abs** | `fractal-abs` | `abs(fbm(...))` — ridged/billowed turbulence | Iterations, Ridge Threshold, Curl | 🔴 P0 |
| **Kaleidoscope** | `kaleidoscope` | Polar fold + angular repeat | Segments, Rotation, Offset, Zoom | 🟡 P1 |
| **Remap** | `remap` | Curve editor → LUT texture for value remapping | Input Range, Output Range, Curve (spline editor) | 🔴 P0 |

#### Wave 3: Synthesizers & FX (Weeks 13–14)
| Module | ID | GLSL Core | Knobs | Priority |
|--------|----|-----------|-------|----------|
| **Gradient Envelope** | `gradient-env` | Multi-stop color ramp sampled by input | Stop Count (up to 12), each: Position + Color + Alpha | 🔴 P0 |
| **Blend** | `blend` | 16 blend modes (multiply, screen, overlay, soft light...) | Mode (dropdown), Opacity, Mask input | 🔴 P0 |
| **Brightness/Contrast** | `bright-contrast` | `(color - 0.5) * contrast + 0.5 + brightness` | Brightness, Contrast, Saturation | 🟡 P1 |
| **Edge Detect** | `edge-detect` | Sobel operator on input | Threshold, Strength, Invert | 🟡 P1 |
| **Distort Grit** | `distort-grit` | `tanh(input * drive)` + noise hiss overlay | Drive, Wow Rate, Hiss Amount, Wet/Dry | 🔴 P0 |
| **Tile** | `tile` | `fract(uv * repeat)` with mirror/wrap modes | Repeat X, Repeat Y, Mode (repeat/mirror/clamp), Offset | 🟡 P1 |
| **Math Op** | `math-op` | A op B: add, sub, mul, div, min, max, pow, mod | Operation (dropdown), Clamp toggle | 🔴 P0 |
| **Output** | `output` | Final node — writes to render target | Resolution, Format (RGBA/RGB), Background | 🔴 P0 |

### Per-Module Build Process (Template)
For EACH module, this checklist is executed:

```
□ 1. Write ModuleDefinition (params, ports, metadata)         [30 min]
□ 2. Write GLSL template with {{placeholders}}                [1–4 hrs]
□ 3. Test GLSL in /dev/shader playground                      [30 min]
□ 4. Register in ModuleRegistry                               [5 min]
□ 5. Create custom UI skin (if non-standard knob layout)      [1 hr]
□ 6. Write unit test: compile in isolation                     [30 min]
□ 7. Write integration test: chain with Perlin VCO             [30 min]
□ 8. Add Storybook story                                      [15 min]
□ 9. Document in module catalog (description, tips, patch ideas)[15 min]
```

### Phase 2 Exit Criteria
- [ ] 20 modules registered, all with GLSL templates
- [ ] Any module can connect to any compatible module
- [ ] "Hero patch" demo: Perlin → Domain Warp → Fractal Abs → Gradient Env → Output renders a cloud texture
- [ ] Module catalog page lists all modules with descriptions
- [ ] Each module has Storybook story showing all knob states

---

## Phase 3: The Render Pipeline (Weeks 15–20)

> **Goal**: Production-quality 2D rendering, export system, resolution independence, multi-pass for complex FX.

### Sprint 3.1 — Render Engine Hardening (Weeks 15–17)
| Task | ID | Details |
|------|----|---------|
| **Multi-pass rendering** | **P3-1** | Some FX (blur, edge detect) need sampling neighbors → require separate pass. Detect these in compiler, auto-insert FBO ping-pong. Max 8 passes with early warning |
| **Resolution pipeline** | **P3-2** | Global resolution selector (256² → 8192²). Preview at 512², export at target. Uniform `u_resolution` updates; all noise scales are resolution-independent |
| **Texture I/O** | **P3-3** | `<SamplePlayer>` module: load PNG/JPG/EXR via `<input type="file">`, create `sampler2D` uniform. Auto-resize to power-of-2. Max 8 textures (GPU limit) |
| **Color space** | **P3-4** | Internal: linear RGB. Display: sRGB conversion in final output pass. Toggle in output module. Color picker works in sRGB, converts to linear for uniforms |
| **Anti-aliasing** | **P3-5** | MSAA 4x on render target. Optional FXAA post-pass (togglable for perf) |

### Sprint 3.2 — Export System (Weeks 18–19)
| Task | ID | Details |
|------|----|---------|
| **PNG/JPG export** | **P3-6** | Render at target resolution to offscreen FBO → `readPixels` → canvas → `toBlob()`. Progress bar for high-res |
| **EXR export** | **P3-7** | Float32 export via custom EXR encoder (or use `three/examples/jsm/loaders/EXRLoader` in reverse). For HDR/PBR workflows |
| **Tiled export** | **P3-8** | For textures >4096²: render in tiles, stitch via OffscreenCanvas. Memory-safe streaming |
| **PBR map pack** | **P3-9** | Output module variant: simultaneous Albedo + Normal + Roughness + Height from different graph branches. Export as zip |
| **Animation export** | **P3-10** | Render `u_time` from 0→duration at target FPS → PNG sequence or WebM (via MediaRecorder). Timeline UI: set duration, FPS, easing |
| **Patch file export** | **P3-11** | `.tspatch` file = JSON + embedded texture thumbnails (base64). Double-click to open (file association in Electron later) |

### Sprint 3.3 — Gradient Editor Deep-Dive (Week 20)
| Task | ID | Details |
|------|----|---------|
| **Advanced gradient editor** | **P3-12** | `<GradientEditor>` component: click to add stops, drag to reposition, double-click for color picker. Interpolation modes: linear, smooth, step. Outputs a 256x1 texture |
| **Curve editor** | **P3-13** | `<CurveEditor>`: Bezier spline editor (like Photoshop curves). Used by Remap module and Gradient Envelope. Exports as LUT texture or GLSL polynomial approximation |
| **Color harmony** | **P3-14** | Palette generator: complementary, triadic, analogous from base hue. Feeds into Gradient Envelope stops. Optional Coolors.co-style lock/unlock |

### Phase 3 Exit Criteria
- [ ] Render at 4096² without crash on 8GB GPU
- [ ] Export PNG, EXR, WebM animation, PBR map pack
- [ ] Multi-pass FX (blur chain) renders correctly
- [ ] Gradient editor supports 12 stops with smooth/step interp
- [ ] Color pipeline is linear internally, sRGB on display

---

## Phase 4: 3D Volumes & Raymarch (Weeks 21–26)

> **Goal**: Patches can output to a 3D volume renderer — orbit a nebula, a terrain, a marble sculpture, all generated from the same patch graph.

### Sprint 4.1 — Raymarch Core (Weeks 21–23)
| Task | ID | Details |
|------|----|---------|
| **Raymarch renderer** | **P4-1** | `<PreviewViewport3D>`: R3F Canvas with perspective camera, orbit controls (`drei`'s `<OrbitControls>`). Render a unit cube with raymarch fragment shader. 64–256 steps, configurable |
| **Density function interface** | **P4-2** | The compiled GLSL's output `float density(vec3 p)` is called by the raymarcher. Module outputs feed into a 3D density field. UV source module gains a "3D" mode (outputs `p` instead of `uv`) |
| **Color accumulation** | **P4-3** | Front-to-back compositing: `color += (1.0 - alpha) * sampleColor * sampleAlpha`. Beer-Lambert absorption for smoke/cloud density |
| **Lighting** | **P4-4** | Single directional light with shadow ray (6-step secondary march). Henyey-Greenstein phase function for anisotropic scattering. Light direction as draggable handle in viewport |
| **LOD / adaptive stepping** | **P4-5** | Empty-space skipping (coarse march → refine). Max distance culling. Step size proportional to accumulated alpha (stop early when opaque). Target: 30fps on M1 at 512² |

### Sprint 4.2 — 3D Modules (Weeks 24–25)
| Task | ID | Details |
|------|----|---------|
| **3D Noise Generator** | **P4-6** | Perlin/Simplex/Voronoi extended to 3D input. Same knobs, but internally uses `noise3D(p * freq)` |
| **SDF Primitives** | **P4-7** | Sphere, box, torus, cylinder as SDF functions. Knobs: size, position, rounding. Boolean ops: union, subtract, intersect (smooth min) |
| **SDF Deform** | **P4-8** | Displace SDF by noise: `sdf(p + noise(p) * amount)`. Twist, bend, taper operations |
| **Raymarch Accumulator** | **P4-9** | The "output" node for 3D: configures step count, absorption, background color. Replaces 2D Output when 3D mode active |
| **Light Phase** | **P4-10** | Scattering module: Mie/Rayleigh selectors, g-factor knob. Feeds into accumulator's lighting model |

### Sprint 4.3 — Viewport & Interaction (Week 26)
| Task | ID | Details |
|------|----|---------|
| **Dual viewport** | **P4-11** | Split view: patchbay on left, 3D preview on right. Resizable divider. Option: float preview as separate window (`window.open` with shared state) |
| **Camera presets** | **P4-12** | Front, top, perspective, orbit-auto-rotate. Save/load camera positions in patch file |
| **3D gizmos** | **P4-13** | SDF primitive positions controllable via 3D translate gizmo (`drei`'s `<TransformControls>`). Gizmo drag → updates node param → updates uniform |
| **Background HDRI** | **P4-14** | Load .hdr environment map for reflections/backdrop. `drei`'s `<Environment>` component |

### Phase 4 Exit Criteria
- [ ] Orbit a Perlin noise cloud in 3D at 30fps
- [ ] SDF boolean operations produce correct geometry
- [ ] Lighting with shadows renders volumetric god rays
- [ ] Same patch graph can output 2D slice OR 3D volume (mode toggle)
- [ ] 3D gizmos directly manipulate node parameters

---

## Phase 5: The Analog Soul (Weeks 27–30)

> **Goal**: Inject imperfection, warmth, and expressiveness. This is what makes TextureSynth feel ALIVE vs. sterile.

### Sprint 5.1 — Drift & Instability (Weeks 27–28)
| Task | ID | Details |
|------|----|---------|
| **Global drift engine** | **P5-1** | Master clock generates slow LFO (0.01–2Hz). `DriftModule` adds Gaussian-distributed jitter to any connected param. Amount knob: 0% (digital) → 100% (drunk). Per-param or global |
| **Knob inertia** | **P5-2** | When user releases knob, value doesn't snap — it decelerates with spring physics (mass=0.8, damping=0.3). Overshoots slightly. Feels like hardware |
| **Voltage sag** | **P5-3** | Visual: when many modules are active, cable colors dim slightly (simulating power draw). "Voltage meter" in corner shows load. Pure aesthetic — no real perf impact shown |
| **Noise floor** | **P5-4** | Subtle grain overlay (1% opacity) on all rendered outputs. Togglable. Uses blue noise texture for perceptually uniform distribution. Simulates analog video noise |
| **Tape wow** | **P5-5** | Time-domain modulation: `u_time` gets subtle sine wobble (±2ms). Makes animations feel organic, not metronomic. Amount knob in master section |

### Sprint 5.2 — Expressive Controls (Weeks 29–30)
| Task | ID | Details |
|------|----|---------|
| **XY Pad** | **P5-6** | `<XYPad>` component: 2D control surface. Finger/mouse position maps to 2 params simultaneously. Spring-return or free mode. Shows trail of recent positions |
| **Macro knobs** | **P5-7** | `MacroModule`: 1 knob controls N params with per-param mapping curves. E.g., "Stormy" macro: cranks Perlin freq + flow strength + darkness simultaneously |
| **Randomizer** | **P5-8** | `RandomizerModule`: On trigger (button or clock), randomize all connected params within user-set ranges. "Happy accident" generator. Seed lock: save a good randomization |
| **LFO Module** | **P5-9** | `LFOModule`: Sine/tri/saw/square/S&H waveforms. Rate (Hz or BPM-synced), depth, phase. Output: float CV signal. Wire to any param's CV input for animation |
| **Envelope follower** | **P5-10** | `EnvelopeFollower`: Analyze input signal's amplitude over time. Output: smoothed float. Use: Make brightness follow noise density dynamically |

### Phase 5 Exit Criteria
- [ ] Drift makes two identical patches look subtly different each render
- [ ] Knobs have satisfying physical inertia
- [ ] LFO wired to Perlin frequency creates animated, breathing texture
- [ ] Macro knob smoothly morphs between "calm" and "chaotic" states
- [ ] Randomizer generates 10 interesting variations from one base patch

---

## Phase 6: AI Co-Pilot (Weeks 31–34)

> **Goal**: Natural language → patch suggestions. NOT generating textures directly — generating *patches* (the instrument config, not the sound).

### Sprint 6.1 — Semantic Patch Engine (Weeks 31–32)
| Task | ID | Details |
|------|----|---------|
| **Patch embedding database** | **P6-1** | Every preset/community patch gets a text embedding (CLIP or sentence-transformers). Store as vector DB (in-memory for v1, Pinecone later). Search: "volcanic rock" → nearest patches |
| **Module tag ontology** | **P6-2** | Each module has semantic tags: `perlin-vco` → [organic, noise, cloud, terrain, base]. Edges have transition tags: perlin→warp = [distortion, flow, heat]. Build tag graph |
| **Prompt parser** | **P6-3** | Simple NLP: extract adjectives (stormy, rusty, neon) → map to module/param suggestions via tag ontology. No LLM needed for v1 — rule-based with fuzzy matching |
| **Auto-patcher** | **P6-4** | Given target tags, select module chain (greedy search through tag graph). Place nodes, connect edges, set params to tag-associated presets. User sees patch build itself with animation |

### Sprint 6.2 — Smart Suggestions (Weeks 33–34)
| Task | ID | Details |
|------|----|---------|
| **"Next module" suggestion** | **P6-5** | Given current patch, suggest 3 modules to add next (collaborative filtering on community patches). Show as ghost modules at edge of graph |
| **Param optimization** | **P6-6** | "Make it more [adjective]" → gradient-free optimization (CMA-ES) on params toward target embedding. 50 iterations, show best result. Uses ONNX CLIP model to score renders |
| **Prompt Bay UI** | **P6-7** | Sidebar panel: text input + suggestion chips. Type "stormy fog" → see chip options: [Perlin + Flow + Dark Palette] [Voronoi + Blur + Blue Tones]. Click to apply |
| **Undo AI actions** | **P6-8** | All AI-generated patches are a single undo group. Ctrl+Z reverts entire AI suggestion in one step |

### Phase 6 Exit Criteria
- [ ] "Stormy clouds" prompt generates a working 4-module patch
- [ ] Suggestions are contextually relevant (not random)
- [ ] "Make it more chaotic" visibly increases complexity
- [ ] All AI actions are fully undoable
- [ ] Works offline (models bundled, ~50MB)

---

## Phase 7: Sync, Collab & Export (Weeks 35–38)

> **Goal**: Real-time collaboration, MIDI/OSC input, Ableton Link, and professional export paths.

### Sprint 7.1 — MIDI & OSC (Weeks 35–36)
| Task | ID | Details |
|------|----|---------|
| **WebMIDI integration** | **P7-1** | `MIDIInputModule`: Select device + channel. Map CC numbers to outputs (float 0–1). Learn mode: twist hardware knob → auto-assigns CC |
| **MIDI mapping overlay** | **P7-2** | Toggle "MIDI Map" mode: click any knob → it flashes → twist hardware knob → mapped. Show mapping as small MIDI icon on knob. Save in patch file |
| **OSC via WebSocket** | **P7-3** | Local bridge app (Electron): receives OSC on UDP, forwards to browser via WebSocket. `OSCInputModule` with address pattern matching. For TouchOSC, Resolume, etc. |
| **BPM sync** | **P7-4** | `BPMModule`: Tap tempo, manual BPM entry, or MIDI clock input. Output: beat position (0–1 per beat), bar position (0–1 per 4 beats). LFO rates can lock to BPM divisions |
| **Ableton Link** | **P7-5** | Via `abletonlink-node` → WebSocket bridge. Sync `u_time` to Link timeline. All BPM-synced modules follow Link tempo changes. Electron only (requires native addon) |

### Sprint 7.2 — Collaboration (Weeks 37–38)
| Task | ID | Details |
|------|----|---------|
| **Yjs CRDT document** | **P7-6** | Patch state (nodes, edges, params) backed by Yjs shared document. All Zustand mutations route through Yjs. Conflict-free by design |
| **WebRTC signaling** | **P7-7** | Simple signaling server (Cloudflare Worker): exchange offers/answers for peer connection. Room codes: share 6-digit code to join jam |
| **Cursor presence** | **P7-8** | Show other users' cursors on patchbay (name + color). Awareness protocol via Yjs. Cursor positions throttled to 10fps |
| **Param lock** | **P7-9** | Click lock icon on knob → only you can edit. Prevents conflicting tweaks. Visual: locked knobs show user's color ring |
| **Chat sidebar** | **P7-10** | Simple text chat in collab session. Yjs text type. Timestamp + username. Emoji reactions on patches |

### Sprint 7.3 — Pro Exports (Week 38)
| Task | ID | Details |
|------|----|---------|
| **Substance Designer import** | **P7-11** | Export `.sbs` compatible node graph (subset: noise → blend → output maps to SD's equivalents). Lossy — not all modules translate |
| **Unity shader export** | **P7-12** | Compile patch to Unity ShaderLab/HLSL. Map uniforms to material properties. Export as `.shader` + `.mat` files |
| **Unreal material export** | **P7-13** | Compile to HLSL custom node for Unreal material editor. Export as `.ush` include file with setup instructions |
| **GLTF texture bake** | **P7-14** | Render all PBR maps, embed in GLTF file with mesh (plane or custom). For Sketchfab/AR |

### Phase 7 Exit Criteria
- [ ] Hardware MIDI controller twists TextureSynth knobs live
- [ ] Two users edit same patch simultaneously without conflicts
- [ ] BPM-synced LFO animates texture in time with music
- [ ] Export to Unity produces working shader material
- [ ] GLTF export viewable in Sketchfab/AR viewer

---

## Phase 8: Polish, Perf & Launch (Weeks 39–42)

> **Goal**: Performance optimization, preset library, onboarding, and launch preparation.

### Sprint 8.1 — Performance (Weeks 39–40)
| Task | ID | Details |
|------|----|---------|
| **WebGPU migration** | **P8-1** | Feature-detect WebGPU. If available, compile to WGSL instead of GLSL. Compute shaders for Flow Advect, FFT. Maintain WebGL2 fallback |
| **Shader cache** | **P8-2** | IndexedDB cache of compiled shader programs (hash → binary). Eliminates recompile on patch reload. Clear cache button in settings |
| **Offscreen rendering** | **P8-3** | OffscreenCanvas in Web Worker for export rendering. Main thread stays responsive during 8K exports |
| **Memory profiling** | **P8-4** | Track texture allocations. Auto-dispose unused FBOs. Warn at 80% GPU memory (estimated via texture count × size) |
| **Mobile optimization** | **P8-5** | Responsive layout (stack patchbay/preview vertically). Touch: pinch-zoom, two-finger pan. Reduce max steps/resolution on mobile GPU. PWA manifest |

### Sprint 8.2 — Content & Onboarding (Weeks 41–42)
| Task | ID | Details |
|------|----|---------|
| **Preset library** | **P8-6** | 50 curated patches across categories: Clouds, Terrain, Abstract, Organic, Sci-Fi, Grunge, Minimal. Each with thumbnail + description. "Init patch" = UV Source → Output |
| **Interactive tutorial** | **P8-7** | 5-step guided tour (using `driver.js` or custom): 1) Drag a module 2) Connect a cable 3) Twist a knob 4) See the output 5) Export. Skippable, re-triggerable |
| **Tooltip system** | **P8-8** | Hover any knob/port: tooltip with name, range, description, and "what does this sound... look like" hint. Data from ModuleDefinition |
| **Landing page** | **P8-9** | Marketing site: Hero animation (live TextureSynth patch rendered as WebGL bg), feature grid, demo video, waitlist signup. Deploy to texturesynth.com |
| **Community infrastructure** | **P8-10** | Patch sharing: upload `.tspatch` to Cloudflare R2. Browse/search/download. Upvote system. Profile pages. API: REST + Cloudflare Workers |
| **Beta launch event** | **P8-11** | Virtual + Toronto in-person. Live patch jam session streamed on Twitch. First 500 beta keys. Press kit with screenshots, GIFs, one-sheet |

### Phase 8 Exit Criteria
- [ ] 60fps at 1080p on GTX 1060 with 20-module patch
- [ ] 30fps on iPhone 14 with 10-module patch
- [ ] 50 preset patches cover major use cases
- [ ] New user completes tutorial in <3 minutes
- [ ] Landing page converts >5% visitors to waitlist
- [ ] Beta launch generates >1000 signups in first week

---

## Module Build Order & Dependency Graph

```
                    ┌─────────────┐
                    │  UV Source   │ ← Everything starts here
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Perlin   │ │ Voronoi  │ │ Gradient │
        │ VCO      │ │ Cells    │ │ Gen      │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
     ┌───────┼────────────┼────────────┘
     ▼       ▼            ▼
┌─────────┐ ┌──────────┐ ┌────────────┐
│ Domain  │ │ Flow     │ │ Gradient   │
│ Warp    │ │ Advect   │ │ Envelope   │
└────┬────┘ └────┬─────┘ └─────┬──────┘
     │           │             │
     └───────────┼─────────────┘
                 ▼
          ┌────────────┐
          │   Blend    │
          └─────┬──────┘
                ▼
          ┌────────────┐
          │   Output   │
          └────────────┘
```

**Build strictly in topological order** — no module can be tested without its upstream dependencies.

---

## Shader Compilation Strategy — Detailed

### The Noise Library (`noise_lib.glsl`)
Pre-authored, bundled, injected into every shader. ~400 lines.

```glsl
// Contents (not full implementation — just the function signatures)

// --- Hashing ---
float hash11(float p);
vec2  hash22(vec2 p);
vec3  hash33(vec3 p);

// --- 2D Noise ---
float perlinNoise2D(vec2 p);
float simplexNoise2D(vec2 p);
float valueNoise2D(vec2 p);
vec2  voronoiNoise2D(vec2 p, float jitter); // returns (cellDist, edgeDist)

// --- 3D Noise ---
float perlinNoise3D(vec3 p);
float simplexNoise3D(vec3 p);

// --- Fractal Wrappers ---
float fbm(vec2 p, int octaves, float lacunarity, float gain);
float fbm3D(vec3 p, int octaves, float lacunarity, float gain);
float ridgedFbm(vec2 p, int octaves, float lacunarity, float gain);
float turbulence(vec2 p, int octaves, float lacunarity, float gain);

// --- Utility ---
vec2  curlNoise2D(vec2 p);
vec3  curlNoise3D(vec3 p);
float remap(float value, float inLow, float inHigh, float outLow, float outHigh);
```

### Compile Pipeline Performance Targets
| Stage | Budget | Technique |
|-------|--------|-----------|
| Topo sort | <1ms | Kahn's — O(V+E), V<100, E<200 |
| Template resolution | <5ms | String replacement, pre-indexed |
| Type coercion insertion | <2ms | Single pass over edges |
| String concatenation | <1ms | Array join |
| Hash computation | <1ms | FNV-1a on final string |
| Cache lookup | <1ms | Map.get() |
| WebGL compile (cache miss) | 50–200ms | Async via `KHR_parallel_shader_compile` |
| **Total (cache hit)** | **<10ms** | |
| **Total (cache miss)** | **<210ms** | |

---

## State Management Architecture

### Store Topology
```
┌─────────────────────────────────────────────────┐
│                  ROOT STORES                     │
│                                                  │
│  usePatchStore          useUIStore               │
│  ├─ nodes{}             ├─ zoom                  │
│  ├─ edges[]             ├─ panOffset             │
│  ├─ params{}            ├─ selectedNodes[]       │
│  ├─ compiledGLSL        ├─ hoveredPort           │
│  ├─ compiledUniforms    ├─ dragState             │
│  │                      ├─ theme                 │
│  │  actions:            ├─ perfMetrics           │
│  │  ├─ addNode()        │                        │
│  │  ├─ removeNode()     │  useCollabStore        │
│  │  ├─ addEdge()        │  ├─ peers[]            │
│  │  ├─ removeEdge()     │  ├─ cursors{}          │
│  │  ├─ updateParam()    │  ├─ locks{}            │
│  │  ├─ loadPatch()      │  ├─ chatMessages[]     │
│  │  └─ undo()/redo()    │                        │
│  │                      │  useAIStore            │
│  │  derived:            │  ├─ suggestions[]      │
│  │  ├─ topoOrder        │  ├─ promptHistory[]    │
│  │  └─ uniformMap       │  └─ modelLoaded        │
│  │                      │                        │
└──┴──────────────────────┴────────────────────────┘
```

### Critical Subscription Pattern
```typescript
// WRONG — causes full re-render on any param change
const params = usePatchStore(state => state.params);

// RIGHT — subscribe to single param, single knob re-renders
const freq = usePatchStore(
  state => state.params[nodeId]?.frequency,
  shallow  // shallow equality check
);
```

### Uniform Update Hot Path (Must be <1ms)
```
User twists knob
  → onPointerMove event
    → usePatchStore.getState().updateParam(nodeId, paramId, value)
      → Immer patch: state.params[nodeId][paramId] = value
        → Zustand notifies ONLY subscribers to that specific param
          → <RotaryKnob> re-renders (React)
          → shaderMaterialRef.current.uniforms[uniformName].value = value (imperative, NOT React)
            → GPU sees new value next frame ✓
```

**Key insight**: The uniform update bypasses React's render cycle entirely. We imperatively set the Three.js uniform via a ref. React only re-renders the knob's visual position.

---

## Testing & QA Strategy

### Test Pyramid
```
        ╱╲
       ╱  ╲        Visual Regression (Playwright)
      ╱ 10 ╲       - Screenshot comparison of render output
     ╱──────╲      - Tolerance: 0.5% pixel diff (noise jitter)
    ╱        ╲
   ╱   30     ╲    Integration (Vitest)
  ╱             ╲   - Module chains compile correctly
 ╱───────────────╲  - Patch load/save round-trips
╱                  ╲
╱       100         ╲  Unit (Vitest)
╱────────────────────╲ - Topo sort, type checker, coercion
                        - Individual GLSL template validity
                        - Param ranges, knob math
```

### Shader Testing Strategy
Since GLSL can't run in Node.js, we use two approaches:

1. **Syntax validation**: Parse GLSL with `glsl-parser` npm package. Check for syntax errors without GPU.
2. **Visual regression**: Playwright loads test page → renders patch → screenshots → compares to golden image (with tolerance for noise).
3. **Deterministic mode**: Disable drift/jitter, fix seed to 42, fix time to 0.0 → reproducible output for regression.

### Performance Benchmarks (Automated)
| Metric | Target | Test Method |
|--------|--------|-------------|
| Shader compile (20 nodes) | <200ms | Benchmark suite, 100 iterations, P95 |
| Knob → uniform update | <1ms | `performance.mark()` wrapper |
| FPS (20 modules, 1080p) | ≥55fps | Playwright + `requestAnimationFrame` counter |
| Patch load (50 nodes) | <500ms | Timed `loadPatch()` call |
| Memory (50 nodes) | <500MB | `performance.memory` check (Chrome only) |

---

## Risk Registry & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | **Shader compile time >500ms on complex patches** | High | High | Web Worker compilation; aggressive caching; `KHR_parallel_shader_compile` extension; limit node count to 50 with warning |
| R2 | **WebGPU adoption too slow** | Medium | Medium | WebGL2 is primary target; WebGPU is progressive enhancement. WGSL compiler is Phase 8, not critical path |
| R3 | **React Flow performance with 100+ nodes** | Medium | High | Virtualize off-screen nodes; custom edge renderer (Canvas2D instead of SVG for >50 edges); consider Pixi.js overlay for cables |
| R4 | **Mobile GPU fragmentation** | High | Medium | Conservative defaults on mobile (max 8 modules, 512² resolution); feature-detect via `WEBGL_debug_renderer_info` |
| R5 | **Community module security** | Medium | High | Sandbox community GLSL (no texture fetches outside designated samplers; no infinite loops via iteration caps); review queue for marketplace |
| R6 | **Scope creep in AI features** | High | Medium | AI is Phase 6 — ship MVP without it. v1 AI is rule-based, not LLM. LLM integration is v2. Hard scope boundary |
| R7 | **Collab conflict resolution** | Low | High | Yjs CRDT handles conflicts mathematically. Test with simulated latency (500ms) and simultaneous edits |
| R8 | **Three.js breaking changes** | Low | Medium | Pin Three.js version. R3F abstracts most breakage. Dedicated upgrade sprint per quarter |
| R9 | **Burnout on 42-week project** | High | Critical | Ship playable demo at Week 8 (Phase 1 exit). Every phase has a "ship this" milestone. Celebrate publicly |

---

## Team Roles & Hiring Plan

### Core Team (5 people)

| Role | Focus | Key Skills | Weeks Active |
|------|-------|------------|-------------|
| **Tech Lead / Architect** (you, Braden) | Vision, architecture, GLSL compiler, module design | R3F, GLSL, system design | 1–42 |
| **R3F / Three.js Engineer** | Render pipeline, 3D volumes, viewport, export | Three.js deep, WebGL/WebGPU, perf | 1–42 |
| **React UI Engineer** | Patchbay, knobs, cable physics, ReactFlow, accessibility | React, animation, a11y, CSS | 1–42 |
| **GLSL / Graphics Engineer** | Noise library, module GLSL templates, shader compilation | GLSL expert, math, procedural gen | 4–30 |
| **Product Designer** | UI/UX, landing page, module skins, branding, onboarding | Figma, motion design, synth/music UX | 1–42 |

### Extended Team (Phase-specific)

| Role | Focus | Weeks Active |
|------|-------|-------------|
| **AI/ML Engineer** (contract) | ONNX models, embedding pipeline, auto-patcher | 31–34 |
| **DevOps / Infra** (part-time) | CI/CD, Cloudflare, monitoring, community platform | 1–42 (10hrs/wk) |
| **Community Manager** | Beta program, social media, patch contests | 35–42 |

---

## File/Folder Structure

```
texturesynth/
├── apps/
│   └── web/                          # Main web application
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── patchbay/
│       │   │   │   ├── PatchBayCanvas.tsx       # ReactFlow wrapper
│       │   │   │   ├── ModuleShell.tsx           # Generic module container
│       │   │   │   ├── PatchCable.tsx            # Custom edge component
│       │   │   │   ├── InputPort.tsx
│       │   │   │   ├── OutputPort.tsx
│       │   │   │   └── MiniPreview.tsx           # Per-module 64x64 preview
│       │   │   ├── controls/
│       │   │   │   ├── RotaryKnob.tsx
│       │   │   │   ├── XYPad.tsx
│       │   │   │   ├── CurveEditor.tsx
│       │   │   │   ├── GradientEditor.tsx
│       │   │   │   ├── Dropdown.tsx
│       │   │   │   └── Switch.tsx
│       │   │   ├── viewport/
│       │   │   │   ├── PreviewViewport2D.tsx
│       │   │   │   ├── PreviewViewport3D.tsx
│       │   │   │   └── ViewportControls.tsx
│       │   │   ├── panels/
│       │   │   │   ├── ModuleBrowser.tsx          # Add-module menu
│       │   │   │   ├── PromptBay.tsx              # AI sidebar
│       │   │   │   ├── PresetBrowser.tsx
│       │   │   │   ├── PerfMonitor.tsx
│       │   │   │   ├── ExportPanel.tsx
│       │   │   │   └── SettingsPanel.tsx
│       │   │   └── onboarding/
│       │   │       └── TutorialOverlay.tsx
│       │   ├── stores/
│       │   │   ├── patchStore.ts                  # Nodes, edges, params
│       │   │   ├── uiStore.ts                     # Zoom, selection, theme
│       │   │   ├── collabStore.ts                 # Yjs state
│       │   │   └── aiStore.ts                     # AI suggestions
│       │   ├── hooks/
│       │   │   ├── useShaderMaterial.ts            # Compile & apply shader
│       │   │   ├── useUniformUpdater.ts            # Imperative uniform updates
│       │   │   ├── useMIDI.ts
│       │   │   ├── useBPM.ts
│       │   │   └── useCollab.ts
│       │   ├── styles/
│       │   │   ├── globals.css
│       │   │   └── theme.css                      # CSS custom properties
│       │   └── utils/
│       │       ├── math.ts
│       │       └── color.ts
│       ├── public/
│       │   ├── textures/                          # Blue noise, HDRIs
│       │   └── models/                            # AI models (ONNX)
│       ├── index.html
│       └── vite.config.ts
│
├── packages/
│   ├── core/                          # Shared types & logic
│   │   ├── src/
│   │   │   ├── types.ts               # PatchDocument, PatchNode, etc.
│   │   │   ├── ModuleRegistry.ts
│   │   │   ├── topoSort.ts
│   │   │   ├── typeChecker.ts
│   │   │   └── serialization.ts
│   │   └── package.json
│   │
│   ├── glsl-compiler/                 # Graph → GLSL transpiler
│   │   ├── src/
│   │   │   ├── compiler.ts            # Main compile function
│   │   │   ├── templateParser.ts      # {{placeholder}} resolver
│   │   │   ├── typeCoercion.ts        # Auto-cast between signal types
│   │   │   ├── assembler.ts           # Final GLSL string builder
│   │   │   ├── cache.ts              # Hash → compiled program
│   │   │   └── compiler.worker.ts     # Web Worker entry point
│   │   ├── glsl/
│   │   │   ├── noise_lib.glsl
│   │   │   ├── common.glsl            # Shared uniforms, utils
│   │   │   └── raymarch.glsl          # Volume rendering core
│   │   └── package.json
│   │
│   ├── modules/                       # All built-in modules
│   │   ├── src/
│   │   │   ├── generators/
│   │   │   │   ├── perlinVCO.ts
│   │   │   │   ├── voronoiCells.ts
│   │   │   │   ├── valueNoise.ts
│   │   │   │   ├── simplexNoise.ts
│   │   │   │   ├── gradientGen.ts
│   │   │   │   └── uvSource.ts
│   │   │   ├── modifiers/
│   │   │   │   ├── bezierWarp.ts
│   │   │   │   ├── flowAdvect.ts
│   │   │   │   ├── domainWarp.ts
│   │   │   │   ├── fractalAbs.ts
│   │   │   │   ├── kaleidoscope.ts
│   │   │   │   └── remap.ts
│   │   │   ├── synthesizers/
│   │   │   │   ├── gradientEnvelope.ts
│   │   │   │   ├── blend.ts
│   │   │   │   ├── brightContrast.ts
│   │   │   │   └── edgeDetect.ts
│   │   │   ├── fx/
│   │   │   │   ├── distortGrit.ts
│   │   │   │   └── tile.ts
│   │   │   ├── utility/
│   │   │   │   ├── mathOp.ts
│   │   │   │   ├── output.ts
│   │   │   │   ├── lfo.ts
│   │   │   │   ├── macro.ts
│   │   │   │   └── randomizer.ts
│   │   │   └── volumes/               # Phase 4
│   │   │       ├── noiseGen3D.ts
│   │   │       ├── sdfPrimitives.ts
│   │   │       ├── sdfDeform.ts
│   │   │       ├── raymarchAccum.ts
│   │   │       └── lightPhase.ts
│   │   ├── glsl/                      # GLSL templates per module
│   │   │   ├── generators/
│   │   │   │   ├── perlinVCO.frag
│   │   │   │   ├── voronoiCells.frag
│   │   │   │   └── ...
│   │   │   ├── modifiers/
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── sdk/                           # Community module SDK
│       ├── src/
│       │   ├── index.ts               # Public API: ModuleDefinition, etc.
│       │   ├── validation.ts          # Validate community modules
│       │   └── sandbox.ts             # GLSL sandbox restrictions
│       └── package.json
│
├── tools/
│   ├── osc-bridge/                    # Electron OSC→WebSocket bridge
│   └── shader-test/                   # Headless shader regression runner
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
└── README.md
```

---

## Definition of Done per Phase

### Universal DoD (applies to ALL phases)
- [ ] All new code has TypeScript strict types (no `any` except justified)
- [ ] All new functions have JSDoc with @param and @returns
- [ ] Unit test coverage ≥80% for new code
- [ ] No lint errors, no TypeScript errors
- [ ] PR reviewed by at least 1 other team member
- [ ] Performance budget not exceeded (FPS, memory, bundle size)
- [ ] Accessible: new UI elements have ARIA labels, keyboard nav works
- [ ] Storybook stories for all new visual components
- [ ] CHANGELOG updated

### Phase-Specific DoD (see each phase above for detailed exit criteria)

---

## Milestone Summary & Timeline

```
Week  1─3   ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 0: Foundation
Week  4─8   ░░░█████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 1: Patchbay Core ← FIRST PLAYABLE 🎮
Week  9─14  ░░░░░░░░██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  Phase 2: 20 Modules
Week 15─20  ░░░░░░░░░░░░░░██████░░░░░░░░░░░░░░░░░░░░░░░  Phase 3: Render Pipeline ← INTERNAL ALPHA 🔧
Week 21─26  ░░░░░░░░░░░░░░░░░░░░██████░░░░░░░░░░░░░░░░░  Phase 4: 3D Volumes
Week 27─30  ░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░░░░░░  Phase 5: Analog Soul ← CLOSED BETA 🔑
Week 31─34  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░░░░░  Phase 6: AI Co-Pilot
Week 35─38  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░░░░░  Phase 7: Sync & Collab
Week 39─42  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  Phase 8: Polish & Launch ← PUBLIC BETA 🚀

Key Dates (targeting Summer 2026 launch):
  Feb 16, 2026  — Project kickoff (Week 1)
  Apr 13, 2026  — First Playable (Week 8) ✶
  Jun 22, 2026  — Internal Alpha (Week 18) ✶
  Aug 31, 2026  — Closed Beta (Week 28) ✶
  Nov 09, 2026  — Public Beta Launch (Week 38) ✶
  Nov 23, 2026  — Launch Event (Week 40) 🎉
```

---

## Appendix A: Key Technical Decisions Log

| Decision | Options Considered | Chosen | Rationale | Date |
|----------|--------------------|--------|-----------|------|
| Node graph library | ReactFlow vs LiteGraph vs Rete.js vs Custom | ReactFlow v12 | React-native, active maintenance, extensible edges/nodes | Feb 2026 |
| State management | Redux vs Zustand vs Jotai vs Valtio | Zustand + Immer | Minimal boilerplate, perfect subscription model for per-knob updates | Feb 2026 |
| Shader compilation | Manual string concat vs AST-based vs GLSL transpiler lib | Custom template + string assembly | No existing lib handles our node-graph-to-monolithic-shader use case | Feb 2026 |
| AI inference | TensorFlow.js vs ONNX Runtime vs WebLLM | ONNX Runtime Web | Smaller bundle, faster WASM inference, WebGPU backend available | Feb 2026 |
| Collab framework | Firebase vs Supabase Realtime vs Yjs | Yjs + WebRTC | CRDT = mathematically conflict-free; P2P = no server costs for jams | Feb 2026 |
| CSS approach | CSS-in-JS vs Tailwind vs vanilla CSS | Tailwind v4 + CSS Modules | Utility for layout speed; CSS Modules for module skin encapsulation | Feb 2026 |

---

## Appendix B: Glossary

| Term | Meaning in TextureSynth |
|------|------------------------|
| **Module** | A single processing unit (like a Eurorack module). Has knobs, inputs, outputs, and GLSL logic |
| **Patch** | A complete configuration of modules + cables + settings. The "project file" |
| **Cable** | A connection between an output port and an input port. Carries a typed signal |
| **CV** | Control Voltage — a float signal used to modulate a parameter (from synth terminology) |
| **Knob** | A rotary control on a module that sets a parameter value |
| **Port** | An input or output connection point on a module |
| **Jam** | A live collaborative patching session between multiple users |
| **Drift** | Intentional randomness added to parameters for analog warmth |
| **Topo Order** | Topological sort order — the sequence modules are evaluated to resolve dependencies |
| **Uniform** | A GPU variable updated per-frame from CPU. How knob values reach the shader |

---

*This document is the single source of truth for building TextureSynth. Every PR references a task ID (e.g., P1-6). Every standup checks against phase exit criteria. Every architectural question starts here.*

**Let's patch the future. ⟡**