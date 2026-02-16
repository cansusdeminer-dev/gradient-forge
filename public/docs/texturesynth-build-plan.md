# TextureSynth — Master Build & Orchestration Plan
### *The Modular Visual Synthesizer for Procedural Realms*
**Version**: 1.0 — February 2026  
**Target**: Browser-first (Vite + React 19), Electron wrapper for desktop  
**Render Core**: React Three Fiber (R3F) + Three.js r170+ + Custom GLSL  
**State**: Zustand 5 + Immer middleware  
**Graph Engine**: Custom fork of ReactFlow 12 or LiteGraph.js  

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack — Locked Decisions](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Phase 0 — Foundation Sprint (Weeks 1–3)](#phase-0)
5. [Phase 1 — The Patch Engine (Weeks 4–8)](#phase-1)
6. [Phase 2 — Generator Modules (Weeks 9–12)](#phase-2)
7. [Phase 3 — Modifier & FX Modules (Weeks 13–16)](#phase-3)
8. [Phase 4 — Synthesizer Modules & Envelopes (Weeks 17–19)](#phase-4)
9. [Phase 5 — 2D Render Pipeline (Weeks 20–22)](#phase-5)
10. [Phase 6 — UI/UX Polish & Tactile Layer (Weeks 23–26)](#phase-6)
11. [Phase 7 — 3D Volume Rendering (Weeks 27–32)](#phase-7)
12. [Phase 8 — AI Co-Pilot Layer (Weeks 33–36)](#phase-8)
13. [Phase 9 — Collaboration & Sync (Weeks 37–39)](#phase-9)
14. [Phase 10 — Export, AR, Marketplace (Weeks 40–44)](#phase-10)
15. [Phase 11 — Performance & Accessibility (Ongoing)](#phase-11)
16. [Component Registry — Every Module Spec](#component-registry)
17. [Shader Compilation Pipeline](#shader-pipeline)
18. [State Management Schema](#state-schema)
19. [Testing Strategy](#testing)
20. [Risk Register & Mitigations](#risks)
21. [Team & Roles](#team)
22. [Milestone Gates & Success Criteria](#milestones)

---

## 1. Architecture Overview <a name="1-architecture-overview"></a>

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │ PatchBay │ │  Knob UI │ │PromptBay│ │ PerfMeter  │  │
│  │(ReactFlow│ │(SVG/CSS) │ │ (AI)    │ │ (FPS/GPU)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘  │
│       │             │            │             │         │
│  ─────┴─────────────┴────────────┴─────────────┴──────  │
│                    ZUSTAND STORE                        │
│        (graph topology, param values, ui state)         │
│  ──────────────────────┬──────────────────────────────  │
│                        │                                │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │              PATCH COMPILER                        │  │
│  │  Graph JSON → Topological Sort → GLSL Assembly    │  │
│  │  (Handles type coercion, branching, caching)      │  │
│  └─────────────────────┬─────────────────────────────┘  │
│                        │                                │
│  ┌─────────────────────▼─────────────────────────────┐  │
│  │           RENDER PIPELINE (R3F)                    │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │  │
│  │  │ 2D Plane │  │ 3D Volume │  │ Post-Process   │  │  │
│  │  │ (Quad)   │  │ (Raymarch)│  │ (EffectComposer│  │  │
│  │  └──────────┘  └───────────┘  └────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  SIDE SYSTEMS                                       ││
│  │  • AI Router (TF.js / ONNX)                         ││
│  │  • MIDI/OSC Bridge (WebMIDI API)                    ││
│  │  • Collab Engine (WebRTC + CRDT)                    ││
│  │  • Export Pipeline (PNG/EXR/GLTF/MP4)               ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Data Flow (Unidirectional)
```
User Action (knob twist / cable connect / AI prompt)
  → Zustand dispatch (immer patch)
    → Graph recompile trigger (debounced 16ms)
      → Topological sort of node graph
        → GLSL fragment assembly (string concatenation of node snippets)
          → ShaderMaterial uniform update (R3F useFrame)
            → GPU renders frame
              → Preview thumbnails update (per-node FBO readback, throttled)
```

---

## 2. Tech Stack — Locked Decisions <a name="2-tech-stack"></a>

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Runtime** | Vite 6 | 6.x | Lightning HMR, native ESM |
| **Framework** | React 19 | 19.x | Concurrent features, use() hook |
| **3D Engine** | React Three Fiber | 9.x | Declarative Three.js, ecosystem |
| **Three.js** | Three.js | r170+ | WebGPURenderer path ready |
| **Graph UI** | @xyflow/react (ReactFlow) | 12.x | Best maintained, custom nodes |
| **State** | Zustand 5 + Immer | 5.x | Lightweight, middleware ecosystem |
| **Shaders** | Raw GLSL (custom compiler) | ES 3.0 | Full control, no abstraction tax |
| **Post-FX** | @react-three/postprocessing | 3.x | Effect Composer integration |
| **Physics** | @react-three/rapier | 2.x | WASM Rapier for mesh deform |
| **AI** | ONNX Runtime Web | 1.x | Smaller than TF.js, WASM+WebGL |
| **MIDI** | WebMIDI API + webmidi.js | 3.x | Hardware controller support |
| **Audio Sync** | Tone.js | 15.x | BPM/transport for animation sync |
| **Collab** | Yjs + y-webrtc | 14.x | CRDT for conflict-free patching |
| **Export Video** | MediaRecorder API + FFmpeg.wasm | 0.13 | Client-side MP4 encode |
| **Export 3D** | Three.js GLTFExporter | native | GLTF/GLB with baked textures |
| **Testing** | Vitest + Playwright | 3.x | Unit + E2E |
| **Styling** | Tailwind CSS 4 + CSS Modules | 4.x | Utility + scoped for modules |
| **Icons** | Lucide React | latest | Consistent, tree-shakeable |
| **Desktop** | Electron 34 (optional) | 34.x | Wraps Vite dev server |
| **Linting** | Biome | 2.x | Replaces ESLint+Prettier |

### WebGPU Strategy
- **Primary**: WebGL2 (universal support today)
- **Progressive**: Feature-detect `navigator.gpu`, use Three.js `WebGPURenderer` when available
- **Compute shaders**: WebGPU compute for heavy noise precomputation (Phase 7+)
- **Fallback**: Canvas2D for ultra-low-end (graceful degradation of preview thumbnails only)

---

## 3. Monorepo Structure <a name="3-monorepo-structure"></a>

```
texturesynth/
├── package.json                    # Workspace root (pnpm workspaces)
├── pnpm-workspace.yaml
├── biome.json                      # Linting config
├── turbo.json                      # Turborepo pipeline
│
├── apps/
│   ├── web/                        # Main Vite + React app
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── main.tsx            # Entry, providers
│   │   │   ├── App.tsx             # Layout shell
│   │   │   │
│   │   │   ├── stores/             # Zustand stores
│   │   │   │   ├── graphStore.ts   # Node/edge topology
│   │   │   │   ├── paramStore.ts   # All knob values (flat map)
│   │   │   │   ├── uiStore.ts      # Panels, selection, zoom
│   │   │   │   ├── renderStore.ts  # Render mode, resolution
│   │   │   │   ├── projectStore.ts # Save/load, undo stack
│   │   │   │   └── aiStore.ts      # Prompt history, suggestions
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Shell.tsx           # Top-level flex layout
│   │   │   │   │   ├── PatchBay.tsx        # ReactFlow canvas wrapper
│   │   │   │   │   ├── PreviewPanel.tsx    # Main 2D/3D render view
│   │   │   │   │   ├── InspectorPanel.tsx  # Selected node params
│   │   │   │   │   ├── PromptBay.tsx       # AI input panel
│   │   │   │   │   ├── Timeline.tsx        # Animation keyframes
│   │   │   │   │   ├── PerfMeter.tsx       # FPS / GPU overlay
│   │   │   │   │   └── Toolbar.tsx         # Top actions bar
│   │   │   │   │
│   │   │   │   ├── patchbay/
│   │   │   │   │   ├── ModuleNode.tsx      # ReactFlow custom node
│   │   │   │   │   ├── CableEdge.tsx       # Animated SVG edge
│   │   │   │   │   ├── PortHandle.tsx      # Typed jack (in/out)
│   │   │   │   │   ├── MiniPreview.tsx     # Per-node FBO thumbnail
│   │   │   │   │   └── NodeContextMenu.tsx # Right-click actions
│   │   │   │   │
│   │   │   │   ├── controls/
│   │   │   │   │   ├── Knob.tsx            # SVG rotary encoder
│   │   │   │   │   ├── Slider.tsx          # Linear fader
│   │   │   │   │   ├── XYPad.tsx           # 2D parameter space
│   │   │   │   │   ├── Toggle.tsx          # On/off jack
│   │   │   │   │   ├── Dropdown.tsx        # Mode select
│   │   │   │   │   ├── ColorStop.tsx       # Gradient stop editor
│   │   │   │   │   └── WaveformDisplay.tsx # Oscilloscope preview
│   │   │   │   │
│   │   │   │   ├── render/
│   │   │   │   │   ├── RenderCanvas.tsx    # R3F <Canvas> wrapper
│   │   │   │   │   ├── Quad2D.tsx          # Fullscreen plane for 2D
│   │   │   │   │   ├── VolumeBox.tsx       # Raymarch cube for 3D
│   │   │   │   │   ├── OrbitControls.tsx   # Camera rig
│   │   │   │   │   ├── EnvironmentHDR.tsx  # IBL for 3D
│   │   │   │   │   └── PostStack.tsx       # EffectComposer chain
│   │   │   │   │
│   │   │   │   └── shared/
│   │   │   │       ├── Modal.tsx
│   │   │   │       ├── Tooltip.tsx
│   │   │   │       └── LoadingSpinner.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useCompileGraph.ts      # Graph → GLSL pipeline
│   │   │   │   ├── useUniformBridge.ts     # Zustand → R3F uniforms
│   │   │   │   ├── useNodePreview.ts       # FBO per-node render
│   │   │   │   ├── useMIDI.ts              # WebMIDI binding
│   │   │   │   ├── useAudioSync.ts         # BPM / Tone.js transport
│   │   │   │   ├── useExport.ts            # PNG/MP4/GLTF export
│   │   │   │   ├── useUndoRedo.ts          # Temporal state
│   │   │   │   └── useKeyboard.ts          # Hotkeys (patch/delete)
│   │   │   │
│   │   │   ├── styles/
│   │   │   │   ├── globals.css             # Tailwind base + vars
│   │   │   │   ├── patchbay.module.css     # Node/cable styles
│   │   │   │   └── controls.module.css     # Knob/slider skins
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── glslHelpers.ts          # String builders
│   │   │       ├── typeCoercion.ts         # float↔vec3 adapters
│   │   │       └── colorSpace.ts           # sRGB/Linear/OKLab
│   │   │
│   │   └── public/
│   │       ├── presets/                    # Factory patch JSONs
│   │       └── textures/                   # Default sample textures
│   │
│   └── electron/                   # Electron main process (Phase 10)
│       ├── main.ts
│       └── preload.ts
│
├── packages/
│   ├── core/                       # @texturesynth/core
│   │   ├── src/
│   │   │   ├── graph/
│   │   │   │   ├── types.ts        # Node, Edge, Port, Signal types
│   │   │   │   ├── topology.ts     # Topological sort, cycle detect
│   │   │   │   ├── compiler.ts     # Graph → GLSL string
│   │   │   │   ├── validator.ts    # Type-check connections
│   │   │   │   └── serializer.ts   # JSON ↔ Graph
│   │   │   │
│   │   │   ├── signals/
│   │   │   │   ├── SignalType.ts   # float, vec2, vec3, vec4, sampler2D
│   │   │   │   ├── coerce.ts      # Auto-cast rules
│   │   │   │   └── constants.ts   # Signal color map for UI
│   │   │   │
│   │   │   └── modules/
│   │   │       ├── BaseModule.ts         # Abstract module class
│   │   │       ├── ModuleRegistry.ts     # Central registry singleton
│   │   │       │
│   │   │       ├── generators/
│   │   │       │   ├── PerlinVCO.ts
│   │   │       │   ├── VoronoiCells.ts
│   │   │       │   ├── ValueNoise.ts
│   │   │       │   ├── SimplexNoise.ts
│   │   │       │   ├── WorleyNoise.ts
│   │   │       │   ├── WhiteNoise.ts
│   │   │       │   ├── CurlNoise.ts
│   │   │       │   ├── LatentOsc.ts
│   │   │       │   ├── SamplePlayer.ts
│   │   │       │   ├── GradientGen.ts
│   │   │       │   ├── ShapeGen.ts       # SDF primitives 2D
│   │   │       │   ├── CheckerGrid.ts
│   │   │       │   ├── BrickPattern.ts
│   │   │       │   └── TileWeave.ts
│   │   │       │
│   │   │       ├── modifiers/
│   │   │       │   ├── BezierWarp.ts
│   │   │       │   ├── FlowAdvect.ts
│   │   │       │   ├── MeshDeform.ts
│   │   │       │   ├── EdgeBlur.ts
│   │   │       │   ├── FractalAbs.ts
│   │   │       │   ├── DomainWarp.ts
│   │   │       │   ├── Kaleidoscope.ts
│   │   │       │   ├── Pixelate.ts
│   │   │       │   ├── Posterize.ts
│   │   │       │   ├── Sharpen.ts
│   │   │       │   ├── Threshold.ts
│   │   │       │   ├── Invert.ts
│   │   │       │   ├── TileRepeat.ts
│   │   │       │   ├── PolarCoords.ts
│   │   │       │   └── TwirlDistort.ts
│   │   │       │
│   │   │       ├── synthesizers/
│   │   │       │   ├── GradientEnv.ts
│   │   │       │   ├── MoodADSR.ts
│   │   │       │   ├── WeightMixer.ts
│   │   │       │   ├── PhaseVocoder.ts
│   │   │       │   ├── ColorMapper.ts
│   │   │       │   ├── LevelsCurves.ts
│   │   │       │   └── ChannelSplitter.ts
│   │   │       │
│   │   │       ├── fx/
│   │   │       │   ├── GodRayScatter.ts
│   │   │       │   ├── BlendReverb.ts
│   │   │       │   ├── DistortGrit.ts
│   │   │       │   ├── EdgeEnhance.ts
│   │   │       │   ├── ChromaticAberr.ts
│   │   │       │   ├── FilmGrain.ts
│   │   │       │   ├── Vignette.ts
│   │   │       │   ├── Bloom.ts
│   │   │       │   ├── LensFlare.ts
│   │   │       │   └── AnalogDrift.ts
│   │   │       │
│   │   │       ├── volumes/          # 3D-specific (Phase 7)
│   │   │       │   ├── RaymarchAccum.ts
│   │   │       │   ├── SDFDeform.ts
│   │   │       │   ├── LightPhase.ts
│   │   │       │   ├── FogVolume.ts
│   │   │       │   └── CloudDensity.ts
│   │   │       │
│   │   │       └── utilities/
│   │   │           ├── MacroKnob.ts
│   │   │           ├── Randomizer.ts
│   │   │           ├── Recorder.ts
│   │   │           ├── AIRouter.ts
│   │   │           ├── MathOp.ts       # Add/Mult/Clamp/Remap
│   │   │           ├── Switch.ts       # A/B signal selector
│   │   │           ├── Oscillator.ts   # LFO for param modulation
│   │   │           ├── Constant.ts     # Fixed float/vec value
│   │   │           ├── UVCoord.ts      # UV source node
│   │   │           ├── TimeNode.ts     # Elapsed time uniform
│   │   │           └── OutputNode.ts   # Terminal render target
│   │   │
│   │   └── package.json
│   │
│   ├── shaders/                    # @texturesynth/shaders
│   │   ├── src/
│   │   │   ├── chunks/             # Reusable GLSL snippets
│   │   │   │   ├── noise_perlin.glsl
│   │   │   │   ├── noise_simplex.glsl
│   │   │   │   ├── noise_voronoi.glsl
│   │   │   │   ├── noise_worley.glsl
│   │   │   │   ├── noise_curl.glsl
│   │   │   │   ├── noise_fbm.glsl
│   │   │   │   ├── noise_value.glsl
│   │   │   │   ├── sdf_2d.glsl
│   │   │   │   ├── sdf_3d.glsl
│   │   │   │   ├── warp_domain.glsl
│   │   │   │   ├── warp_flow.glsl
│   │   │   │   ├── warp_bezier.glsl
│   │   │   │   ├── color_oklab.glsl
│   │   │   │   ├── color_hsv.glsl
│   │   │   │   ├── blend_modes.glsl
│   │   │   │   ├── raymarch_core.glsl
│   │   │   │   ├── lighting_pbr.glsl
│   │   │   │   ├── scatter_hg.glsl
│   │   │   │   └── util_remap.glsl
│   │   │   │
│   │   │   ├── templates/
│   │   │   │   ├── quad_vert.glsl      # Standard 2D vertex
│   │   │   │   ├── quad_frag.glsl      # 2D fragment template
│   │   │   │   ├── volume_vert.glsl    # 3D box vertex
│   │   │   │   └── volume_frag.glsl    # 3D raymarch template
│   │   │   │
│   │   │   └── compiler/
│   │   │       ├── assembler.ts        # Stitches chunks into final shader
│   │   │       ├── optimizer.ts        # Dead code elimination
│   │   │       ├── uniformMap.ts       # Extracts uniform declarations
│   │   │       └── cache.ts           # Hash-based shader cache
│   │   │
│   │   └── package.json
│   │
│   ├── ai/                         # @texturesynth/ai (Phase 8)
│   │   ├── src/
│   │   │   ├── router.ts           # Prompt → module graph
│   │   │   ├── embeddings.ts       # Module semantic vectors
│   │   │   ├── suggester.ts        # Cable completion
│   │   │   └── models/             # ONNX model files
│   │   └── package.json
│   │
│   └── sdk/                        # @texturesynth/sdk (Community modules)
│       ├── src/
│       │   ├── createModule.ts     # Factory helper
│       │   ├── validators.ts       # Schema validation
│       │   └── types.ts            # Public type exports
│       └── package.json
│
├── presets/                        # Factory preset patches
│   ├── basics/
│   │   ├── simple-perlin.json
│   │   ├── voronoi-marble.json
│   │   └── gradient-sunset.json
│   ├── advanced/
│   │   ├── nebula-volume.json
│   │   ├── cyberpunk-rust.json
│   │   └── organic-flow.json
│   └── schema.json                 # Patch file JSON Schema
│
└── docs/
    ├── ARCHITECTURE.md
    ├── MODULE_AUTHORING.md
    ├── SHADER_GUIDE.md
    └── API_REFERENCE.md
```

---

## 4. Phase 0 — Foundation Sprint (Weeks 1–3) <a name="phase-0"></a>

### Goal
Scaffolded monorepo, running dev server, empty canvas renders, ReactFlow shows a single dummy node.

### Tasks

| # | Task | Owner | Est. | Deps | Deliverable |
|---|------|-------|------|------|-------------|
| 0.1 | Init monorepo (pnpm workspaces + Turborepo) | Lead | 2h | — | `turbo dev` runs |
| 0.2 | Scaffold `apps/web` with Vite 6 + React 19 + TypeScript 5.7 | Lead | 3h | 0.1 | HMR working |
| 0.3 | Install & configure Tailwind CSS 4 | UI Dev | 2h | 0.2 | Utility classes available |
| 0.4 | Set up Biome for linting + formatting | Lead | 1h | 0.1 | `turbo lint` passes |
| 0.5 | Create `packages/core` with TypeScript build | Core Dev | 3h | 0.1 | Importable from web app |
| 0.6 | Create `packages/shaders` with raw .glsl imports (vite-plugin-glsl) | Shader Dev | 2h | 0.2 | `.glsl` files import as strings |
| 0.7 | Set up Zustand stores (graph, param, ui, render) — empty skeletons | Core Dev | 4h | 0.5 | Stores accessible via hooks |
| 0.8 | Integrate ReactFlow 12 into `PatchBay.tsx` | UI Dev | 6h | 0.2 | Pannable/zoomable canvas |
| 0.9 | Integrate React Three Fiber `<Canvas>` into `PreviewPanel.tsx` | R3F Dev | 4h | 0.2 | Black R3F canvas rendering |
| 0.10 | Create `Shell.tsx` layout (split pane: PatchBay left, Preview right) | UI Dev | 4h | 0.8, 0.9 | Resizable panels |
| 0.11 | Set up Vitest for packages, Playwright for web app | QA / Lead | 4h | 0.1 | `turbo test` scaffold |
| 0.12 | CI pipeline (GitHub Actions): lint + test + build | Lead | 3h | 0.11 | Green pipeline on PR |
| 0.13 | Design system tokens: colors, spacing, typography (dark nebula theme) | Designer | 6h | 0.3 | CSS custom properties |
| 0.14 | Create dummy `ModuleNode.tsx` (ReactFlow custom node) — renders a box with ports | UI Dev | 4h | 0.8 | Visible node on canvas |

### Acceptance Criteria
- [ ] `pnpm dev` opens browser with split-pane layout
- [ ] Left panel: ReactFlow canvas with one draggable dummy node
- [ ] Right panel: R3F canvas with a rotating cube (proof of life)
- [ ] All packages build, lint passes, test scaffold runs
- [ ] Dark theme applied globally

---

## 5. Phase 1 — The Patch Engine (Weeks 4–8) <a name="phase-1"></a>

### Goal
The core graph engine that compiles a node graph into a runnable GLSL shader. This is the *heart* of TextureSynth.

### 1A. Type System & Signal Model (Week 4)

```typescript
// packages/core/src/signals/SignalType.ts

export enum SignalType {
  FLOAT   = 'float',      // Scalar (density, mask, alpha)
  VEC2    = 'vec2',        // UV coords, flow fields
  VEC3    = 'vec3',        // RGB color, 3D position
  VEC4    = 'vec4',        // RGBA color
  SAMPLER = 'sampler2D',   // Texture reference
  BOOL    = 'bool',        // Toggle/gate
}

// Auto-coercion rules (implicit casts)
export const COERCION_MAP: Record<string, string> = {
  'float→vec2':  'vec2(x, x)',
  'float→vec3':  'vec3(x, x, x)',
  'float→vec4':  'vec4(x, x, x, 1.0)',
  'vec2→float':  'length(x)',
  'vec3→float':  '(x.r * 0.299 + x.g * 0.587 + x.b * 0.114)', // luminance
  'vec3→vec4':   'vec4(x, 1.0)',
  'vec4→vec3':   'x.rgb',
  // ... etc
};
```

### 1B. Base Module Abstract Class (Week 4)

```typescript
// packages/core/src/modules/BaseModule.ts

export interface PortDef {
  name: string;
  type: SignalType;
  default?: number | number[];   // Default value if unconnected
  description?: string;
}

export interface KnobDef {
  name: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  curve?: 'linear' | 'exponential' | 'logarithmic';
  unit?: string;                 // 'Hz', '%', 'px'
  description?: string;
}

export abstract class BaseModule {
  abstract readonly id: string;           // 'perlin-vco'
  abstract readonly name: string;         // 'Perlin VCO'
  abstract readonly category: ModuleCategory;
  abstract readonly description: string;
  abstract readonly inputs: PortDef[];
  abstract readonly outputs: PortDef[];
  abstract readonly knobs: KnobDef[];
  
  // Returns GLSL function body. 
  // `inputVars` maps input port names → GLSL variable names from upstream.
  // `knobVars` maps knob names → uniform names.
  abstract compileGLSL(
    inputVars: Record<string, string>,
    knobVars: Record<string, string>,
    outputVars: Record<string, string>
  ): string;
  
  // Returns list of GLSL #include chunks this module needs
  abstract getRequiredChunks(): string[];
}
```

### 1C. Graph Topology Engine (Week 5)

```typescript
// packages/core/src/graph/topology.ts

export interface GraphNode {
  id: string;
  moduleId: string;          // References BaseModule.id
  position: { x: number; y: number };
  knobValues: Record<string, number>;
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  sourcePort: string;        // Output port name
  targetNodeId: string;
  targetPort: string;        // Input port name
}

export interface PatchGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  outputNodeId: string;      // Which node feeds final render
}

// Kahn's algorithm - topological sort with cycle detection
export function topologicalSort(graph: PatchGraph): GraphNode[] | 'CYCLE' { ... }

// Returns ordered list of node IDs from sources to output
export function getCompilationOrder(graph: PatchGraph): string[] { ... }

// Validates all connections have compatible types (with coercion)
export function validateGraph(graph: PatchGraph): ValidationResult { ... }
```

### 1D. GLSL Compiler (Weeks 6–7)

This is the most critical subsystem. It walks the sorted graph and assembles a complete fragment shader.

```typescript
// packages/shaders/src/compiler/assembler.ts

export interface CompiledShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { type: string; value: any }>;
  hash: string;               // For cache lookup
}

export function compileGraph(
  graph: PatchGraph,
  registry: ModuleRegistry,
  mode: '2d' | '3d'
): CompiledShader {
  
  const order = getCompilationOrder(graph);
  const chunks = new Set<string>();
  const uniformDecls: string[] = [];
  const bodyLines: string[] = [];
  
  for (const nodeId of order) {
    const node = graph.nodes.find(n => n.id === nodeId)!;
    const module = registry.get(node.moduleId);
    
    // Collect required GLSL chunks
    module.getRequiredChunks().forEach(c => chunks.add(c));
    
    // Map input ports → upstream variable names (with coercion)
    const inputVars = resolveInputVars(node, graph, module);
    
    // Map knobs → uniform names, register uniforms
    const knobVars = registerKnobUniforms(node, module, uniformDecls);
    
    // Map output ports → generated variable names
    const outputVars = generateOutputVars(node, module);
    
    // Get GLSL body from module
    bodyLines.push(`// --- ${module.name} [${nodeId}] ---`);
    bodyLines.push(module.compileGLSL(inputVars, knobVars, outputVars));
  }
  
  // Assemble final shader
  const fragment = assembleFragment(chunks, uniformDecls, bodyLines, mode);
  
  return {
    vertexShader: mode === '2d' ? QUAD_VERT : VOLUME_VERT,
    fragmentShader: fragment,
    uniforms: buildUniformObject(uniformDecls, graph),
    hash: hashShader(fragment),
  };
}
```

### 1E. Zustand ↔ Graph Bridge (Week 7)

```typescript
// apps/web/src/stores/graphStore.ts

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  outputNodeId: string | null;
  
  // Actions
  addNode: (moduleId: string, position: {x: number, y: number}) => void;
  removeNode: (nodeId: string) => void;
  connect: (edge: Omit<GraphEdge, 'id'>) => void;
  disconnect: (edgeId: string) => void;
  updateKnob: (nodeId: string, knobName: string, value: number) => void;
  setOutput: (nodeId: string) => void;
  
  // Derived
  compiledShader: CompiledShader | null;
  compileError: string | null;
  recompile: () => void;          // Triggers compiler
}
```

### 1F. ReactFlow ↔ Zustand Sync (Week 8)

```typescript
// apps/web/src/components/patchbay/PatchBay.tsx

// ReactFlow nodes/edges derive from Zustand graphStore
// User interactions (drag, connect, delete) dispatch to Zustand
// Zustand middleware triggers recompile on topology changes
// Recompile is debounced (16ms) to avoid shader thrash during rapid edits
```

### Tasks Table

| # | Task | Est. | Deliverable |
|---|------|------|-------------|
| 1.1 | Define SignalType enum + coercion map | 4h | Type system |
| 1.2 | Implement BaseModule abstract class | 6h | Module contract |
| 1.3 | Build ModuleRegistry (singleton, register/get) | 3h | Registry |
| 1.4 | Implement topological sort (Kahn's algo) | 6h | Sort + cycle detection |
| 1.5 | Build graph validator (type compatibility) | 8h | Validation errors |
| 1.6 | Implement GLSL assembler (chunk stitching) | 16h | Fragment assembly |
| 1.7 | Build uniform mapper (knob values → uniforms) | 6h | Uniform bridge |
| 1.8 | Implement shader cache (hash-based) | 4h | Cache hits/misses |
| 1.9 | Wire graphStore in Zustand (full CRUD) | 8h | Store working |
| 1.10 | Sync ReactFlow ↔ Zustand (bidirectional) | 10h | Nodes/edges sync |
| 1.11 | Build `useCompileGraph` hook (debounced) | 6h | Auto-recompile |
| 1.12 | Build `useUniformBridge` hook (params → R3F) | 6h | Live uniform updates |
| 1.13 | Implement OutputNode module (terminal) | 4h | Render target node |
| 1.14 | Implement UVCoord module (UV source) | 3h | UV input node |
| 1.15 | Implement Constant module (fixed value) | 2h | Value source |
| 1.16 | Integration test: UV → Output renders gradient | 8h | First compiled shader! |
| 1.17 | Serializer: Graph ↔ JSON (save/load) | 6h | Patch files |

### Acceptance Criteria
- [ ] Connect UVCoord → OutputNode → see UV gradient in R3F canvas
- [ ] Add Constant node, connect → see solid color
- [ ] Disconnect cable → output updates immediately
- [ ] Cycle detection prevents invalid connections
- [ ] Type mismatch shows warning, auto-coerces where possible
- [ ] Save patch to JSON, reload, identical render

---

## 6. Phase 2 — Generator Modules (Weeks 9–12) <a name="phase-2"></a>

### Goal
All 14 generator modules operational, each producing visible output when connected to OutputNode.

### GLSL Chunk Requirements
Each generator needs its noise/pattern GLSL. Write once, reuse everywhere.

| Chunk File | Functions Provided | Used By |
|------------|-------------------|---------|
| `noise_perlin.glsl` | `perlin2d()`, `perlin3d()` | PerlinVCO, FBM |
| `noise_fbm.glsl` | `fbm()` (configurable octaves) | PerlinVCO |
| `noise_simplex.glsl` | `simplex2d()`, `simplex3d()` | SimplexNoise |
| `noise_voronoi.glsl` | `voronoi()` → (cellDist, cellID) | VoronoiCells |
| `noise_worley.glsl` | `worley()` → F1, F2 distances | WorleyNoise |
| `noise_value.glsl` | `valueNoise()` | ValueNoise |
| `noise_curl.glsl` | `curlNoise2d()`, `curlNoise3d()` | CurlNoise |
| `sdf_2d.glsl` | `sdCircle()`, `sdBox()`, `sdHex()` etc. | ShapeGen |

### Module Implementation Order (Dependency-driven)

| Week | Modules | Rationale |
|------|---------|-----------|
| 9 | PerlinVCO, ValueNoise, WhiteNoise | Foundation noises, test pipeline |
| 10 | SimplexNoise, VoronoiCells, WorleyNoise | Core procedural vocabulary |
| 11 | CurlNoise, GradientGen, ShapeGen, CheckerGrid | Patterns + shapes |
| 12 | BrickPattern, TileWeave, LatentOsc (skeleton), SamplePlayer (skeleton) | Fill out category |

### Per-Module Implementation Spec (Example: PerlinVCO)

```typescript
// packages/core/src/modules/generators/PerlinVCO.ts

export class PerlinVCO extends BaseModule {
  readonly id = 'perlin-vco';
  readonly name = 'Perlin VCO';
  readonly category = 'generator';
  readonly description = 'Multi-octave FBM Perlin noise generator';
  
  readonly inputs: PortDef[] = [
    { name: 'uv', type: SignalType.VEC2, description: 'Coordinate input' },
    { name: 'freqMod', type: SignalType.FLOAT, default: 0, description: 'Frequency modulation' },
  ];
  
  readonly outputs: PortDef[] = [
    { name: 'density', type: SignalType.FLOAT, description: 'Noise value 0-1' },
    { name: 'rgb', type: SignalType.VEC3, description: 'Palette-mapped color' },
  ];
  
  readonly knobs: KnobDef[] = [
    { name: 'frequency', min: 0.1, max: 50, default: 4, curve: 'exponential', unit: 'Hz' },
    { name: 'octaves', min: 1, max: 12, default: 6, step: 1 },
    { name: 'lacunarity', min: 1, max: 4, default: 2.0 },
    { name: 'gain', min: 0, max: 1, default: 0.5 },
    { name: 'seed', min: 0, max: 999, default: 0, step: 1 },
    { name: 'amplitude', min: 0, max: 2, default: 1 },
  ];
  
  getRequiredChunks() {
    return ['noise_perlin', 'noise_fbm'];
  }
  
  compileGLSL(inputs, knobs, outputs): string {
    return `
      vec2 ${outputs.density}_uv = ${inputs.uv} * ${knobs.frequency} + ${knobs.freqMod};
      float ${outputs.density} = fbm(
        ${outputs.density}_uv + vec2(${knobs.seed}),
        int(${knobs.octaves}),
        ${knobs.lacunarity},
        ${knobs.gain}
      ) * ${knobs.amplitude};
      vec3 ${outputs.rgb} = vec3(${outputs.density});
    `;
  }
}
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 2.1 | Write `noise_perlin.glsl` (2D/3D) | 6h |
| 2.2 | Write `noise_fbm.glsl` (generic, configurable) | 4h |
| 2.3 | Implement PerlinVCO module | 4h |
| 2.4 | Write `noise_value.glsl` | 3h |
| 2.5 | Implement ValueNoise module | 2h |
| 2.6 | Implement WhiteNoise module (hash-based) | 2h |
| 2.7 | Write `noise_simplex.glsl` | 6h |
| 2.8 | Implement SimplexNoise module | 3h |
| 2.9 | Write `noise_voronoi.glsl` | 8h |
| 2.10 | Implement VoronoiCells module | 4h |
| 2.11 | Write `noise_worley.glsl` | 6h |
| 2.12 | Implement WorleyNoise module | 3h |
| 2.13 | Write `noise_curl.glsl` | 6h |
| 2.14 | Implement CurlNoise module | 3h |
| 2.15 | Implement GradientGen (linear/radial/angular/diamond) | 6h |
| 2.16 | Write `sdf_2d.glsl` (10+ primitives) | 8h |
| 2.17 | Implement ShapeGen module | 4h |
| 2.18 | Implement CheckerGrid module | 2h |
| 2.19 | Implement BrickPattern module | 4h |
| 2.20 | Implement TileWeave module | 4h |
| 2.21 | Implement LatentOsc skeleton (outputs random palette for now) | 4h |
| 2.22 | Implement SamplePlayer skeleton (loads image as texture uniform) | 6h |
| 2.23 | Per-node preview thumbnails (FBO readback) | 10h |
| 2.24 | Module browser/palette UI (searchable, categorized) | 8h |

### Acceptance Criteria
- [ ] All 14 generators produce visible output when connected to OutputNode
- [ ] Knob tweaks update render in real-time (<16ms latency for uniform changes)
- [ ] Each node shows a small live preview thumbnail
- [ ] Module palette allows searching and drag-to-add

---

## 7. Phase 3 — Modifier & FX Modules (Weeks 13–16) <a name="phase-3"></a>

### Goal
All modifier and FX modules. These transform signals from generators.

### Key Shader Chunks Needed

| Chunk | Functions | Used By |
|-------|-----------|---------|
| `warp_domain.glsl` | `domainWarp()` | DomainWarp |
| `warp_flow.glsl` | `advect()`, `rk4Step()` | FlowAdvect |
| `warp_bezier.glsl` | `bezierCurve()`, `bezierWarp()` | BezierWarp |
| `blend_modes.glsl` | `blendMultiply()`, `blendScreen()`, etc (16 modes) | BlendReverb |
| `color_oklab.glsl` | `linearToOklab()`, `oklabToLinear()` | ColorMapper |
| `color_hsv.glsl` | `rgb2hsv()`, `hsv2rgb()` | Various |

### Implementation Order

| Week | Modules | Notes |
|------|---------|-------|
| 13 | MathOp, Invert, Threshold, Posterize | Simple utility transforms |
| 13 | DomainWarp, TwirlDistort | UV manipulation |
| 14 | FractalAbs, FlowAdvect, BezierWarp | Core warps |
| 14 | Kaleidoscope, PolarCoords, TileRepeat | Spatial transforms |
| 15 | EdgeBlur, Sharpen, Pixelate | Image processing |
| 15 | BlendReverb (16 blend modes), DistortGrit | FX core |
| 16 | GodRayScatter, EdgeEnhance, ChromaticAberr | Advanced FX |
| 16 | FilmGrain, Vignette, Bloom, LensFlare, AnalogDrift | Post-process FX |

### Critical: Multi-Input Handling
Some modules (BlendReverb, WeightMixer) take multiple inputs. The compiler must handle fan-in:

```glsl
// BlendReverb with 2 inputs:
vec3 blend_node5_out = blendMultiply(node3_rgb, node4_rgb) * u_node5_wetDry 
                     + node3_rgb * (1.0 - u_node5_wetDry);
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 3.1–3.15 | Implement all 15 modifier modules | 60h |
| 3.16–3.25 | Implement all 10 FX modules | 50h |
| 3.26 | Write `blend_modes.glsl` (16 modes) | 8h |
| 3.27 | Write all warp chunks | 12h |
| 3.28 | Write color space conversion chunks | 6h |
| 3.29 | Multi-input compiler support | 8h |
| 3.30 | FX chain ordering UI (drag to reorder) | 6h |

### Acceptance Criteria
- [ ] Chain: PerlinVCO → FractalAbs → DomainWarp → GodRayScatter → Output produces complex visual
- [ ] All blend modes visually verified against Photoshop reference
- [ ] AnalogDrift adds subtle frame-to-frame variation (not static)
- [ ] Module hover shows I/O type compatibility

---

## 8. Phase 4 — Synthesizer Modules & Envelopes (Weeks 17–19) <a name="phase-4"></a>

### Goal
Envelope/envelope-like modules that control *how* signals evolve over time and parameter space.

### Modules

| Module | Key Feature | Implementation Notes |
|--------|-------------|---------------------|
| GradientEnv | ADSR-style color ramp with draggable stops | UI-heavy: Stop editor component, spline interpolation |
| MoodADSR | Latent-space interpolation envelope | Requires latent embedding vectors (stub with manual 8D vec) |
| WeightMixer | Painted influence map blending | Canvas overlay for brush painting weights (OffscreenCanvas → texture) |
| PhaseVocoder | FFT-based spectral morph | Web Audio AnalyserNode → texture upload |
| ColorMapper | Value → OKLab color LUT | 1D texture lookup with editable curve |
| LevelsCurves | Photoshop-style levels/curves | Bezier curve editor → 1D LUT texture |
| ChannelSplitter | Split vec3/vec4 → individual floats | Pure compiler routing, minimal GLSL |
| TimeNode | Elapsed time / BPM-synced time | `uniform float u_time;` managed by R3F useFrame |
| Oscillator (LFO) | Sin/Saw/Square/Random modulation source | Modulates any knob via CV routing |

### Key Innovation: CV Modulation System

Any knob on any module can be *modulated* by connecting a signal to it (like CV in Eurorack):

```typescript
// In the compiler, when a knob has an incoming CV connection:
// Instead of: float frequency = u_node1_frequency;
// Emit:       float frequency = u_node1_frequency + cv_input * u_node1_freqModDepth;

interface KnobDef {
  // ... existing fields
  modulatable: boolean;       // Can accept CV input (default: true)
  modDepthRange: [number, number]; // How much CV can affect the knob
}
```

This means every module implicitly gains extra inputs when knobs are modulatable. The UI shows small "CV jack" circles next to each knob.

### Tasks

| # | Task | Est. |
|---|------|------|
| 4.1 | Implement CV modulation in compiler | 12h |
| 4.2 | CV jack UI next to knobs | 8h |
| 4.3 | GradientEnv module + stop editor UI | 16h |
| 4.4 | ColorMapper + 1D LUT curve editor | 12h |
| 4.5 | LevelsCurves module + bezier curve UI | 12h |
| 4.6 | TimeNode + `u_time` uniform management | 4h |
| 4.7 | Oscillator (LFO) module (4 waveforms) | 8h |
| 4.8 | ChannelSplitter module | 3h |
| 4.9 | WeightMixer + paint overlay UI | 16h |
| 4.10 | MoodADSR skeleton (8D manual vector) | 8h |
| 4.11 | PhaseVocoder skeleton (audio input → texture) | 10h |

### Acceptance Criteria
- [ ] LFO → PerlinVCO frequency CV = animated, pulsing noise
- [ ] GradientEnv stop editor: drag stops, colors update live
- [ ] WeightMixer: paint on canvas, blend 3 layers by painted mask
- [ ] TimeNode drives animation at consistent BPM

---

## 9. Phase 5 — 2D Render Pipeline (Weeks 20–22) <a name="phase-5"></a>

### Goal
Production-quality 2D output: resolution control, export pipeline, multi-pass support.

### Render Architecture

```
┌──────────────┐
│  Compiled     │     ┌─────────────┐
│  Fragment     ├────►│ Quad2D.tsx  │ Fullscreen plane in R3F
│  Shader       │     │ <mesh>      │ with <shaderMaterial>
└──────────────┘     │  <planeGeo> │
                      │  <shaderMat>│───► R3F <Canvas>
                      └─────────────┘
                            │
                      ┌─────▼─────────┐
                      │ PostStack.tsx  │ EffectComposer:
                      │ - Bloom        │ (optional post-FX
                      │ - Vignette     │  applied to final)
                      │ - ChromAberr   │
                      └───────────────┘
```

### Multi-Pass Support
Some module chains require intermediate render targets (e.g., FlowAdvect reading its own previous frame for feedback):

```typescript
// Feedback detection in compiler:
// If a node's input connects to a downstream node (cycle via feedback),
// insert a "PingPong FBO" pair and sample previous frame as texture.

export function detectFeedbackPaths(graph: PatchGraph): FeedbackLoop[] {
  // Returns pairs of (writerNodeId, readerNodeId) that need FBO ping-pong
}
```

### Export Pipeline

| Format | Method | Resolution |
|--------|--------|-----------|
| PNG | Canvas `.toBlob()` via R3F `gl.domElement` | Up to 8192×8192 (offscreen FBO) |
| JPEG | Same, quality param | Same |
| EXR (HDR) | Custom float texture readback → EXR encoder | Up to 4096×4096 |
| WebP | Canvas `.toBlob('image/webp')` | Same |
| Tiled | Render quadrants, stitch in worker | Up to 16384×16384 |

### Tasks

| # | Task | Est. |
|---|------|------|
| 5.1 | Resolution selector (256→8192, custom) | 4h |
| 5.2 | Offscreen FBO rendering for export (separate from preview) | 10h |
| 5.3 | PNG/JPEG/WebP export | 6h |
| 5.4 | Multi-pass ping-pong FBO system | 16h |
| 5.5 | Feedback loop detection in compiler | 8h |
| 5.6 | Tiled rendering for huge exports | 10h |
| 5.7 | Aspect ratio lock/unlock | 3h |
| 5.8 | Background transparency support (alpha channel) | 4h |
| 5.9 | Seamless/tileable mode (UV wrapping) | 6h |
| 5.10 | PBR map export (Normal, Roughness, AO from single patch) | 12h |

### Acceptance Criteria
- [ ] Export 4096×4096 PNG of complex patch in <2s
- [ ] Feedback-based FlowAdvect creates swirling animation
- [ ] Seamless mode: exported tile repeats without visible seams
- [ ] PBR export: 4 maps (Albedo, Normal, Roughness, AO) from branched graph

---

## 10. Phase 6 — UI/UX Polish & Tactile Layer (Weeks 23–26) <a name="phase-6"></a>

### Goal
Transform the functional prototype into the tactile, analog-feeling instrument described in the vision.

### Knob Component Deep Dive

```typescript
// apps/web/src/components/controls/Knob.tsx

interface KnobProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md' | 'lg';     // 32/48/64px
  curve?: 'linear' | 'exp' | 'log';
  label: string;
  unit?: string;
  color?: string;                  // Accent ring color
  cvConnected?: boolean;           // Shows modulation ring
  cvAmount?: number;               // Mod depth indicator
}

// Interaction model:
// - Click+drag vertical (primary) — Ableton-style
// - Scroll wheel (fine adjust with Shift)
// - Double-click to type value
// - Right-click for MIDI learn
// - Inertia: easeOutCubic on fast drags
// - Visual: SVG arc, notch indicator, value readout
// - Haptic: navigator.vibrate(5) on detent positions (if defined)
```

### Cable Rendering

```typescript
// apps/web/src/components/patchbay/CableEdge.tsx

// Cables are custom ReactFlow edges:
// - Bezier curve (cubic) between ports
// - Color coded by SignalType:
//     float = cyan (#00E5FF)
//     vec2  = green (#76FF03)  
//     vec3  = orange (#FF9100)
//     vec4  = magenta (#E040FB)
//     sampler = white (#FFFFFF)
// - Thickness: 2px idle, 3px hovered, pulse animation when signal flowing
// - Rubber-band physics on drag (spring simulation)
// - Snap with magnetic pull when near compatible port (12px radius)
// - Audio: subtle 'click' on connect (Web Audio oscillator burst, 2ms)
```

### Layout & Panels

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─Toolbar──────────────────────────────────────────────────┐│
│ │ [≡] TextureSynth  │ File ▾ │ Edit ▾ │ View ▾ │ [⏺ Rec] ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌─Module Palette─┐ ┌─PatchBay────────────┐ ┌─Preview─────┐│
│ │ 🔍 Search...   │ │                     │ │             ││
│ │                │ │   [Node]──cable──    │ │   R3F       ││
│ │ ▸ Generators   │ │         \           │ │   Canvas    ││
│ │ ▸ Modifiers    │ │   [Node]──[Node]    │ │             ││
│ │ ▸ Synthesizers │ │                     │ │             ││
│ │ ▸ FX           │ │                     │ │  [2D][3D]   ││
│ │ ▸ Volumes      │ │                     │ │  [res ▾]    ││
│ │ ▸ Utilities    │ │                     │ │             ││
│ │                │ │                     │ ├─Inspector───┤│
│ │ [+ New Module] │ │                     │ │ PerlinVCO   ││
│ │                │ │                     │ │ ◎ Freq: 4.0 ││
│ │ ▸ Presets      │ │                     │ │ ◎ Oct:  6   ││
│ │   Nebula Cloud │ │                     │ │ ◎ Lac:  2.0 ││
│ │   Marble Vein  │ │                     │ │ ◎ Gain: 0.5 ││
│ │   ...          │ │                     │ │ ◎ Seed: 42  ││
│ └────────────────┘ └─────────────────────┘ └─────────────┘│
│ ┌─Timeline / Prompt Bay───────────────────────────────────┐│
│ │ [▶] ──●────────────────── 0:00 / 0:30   │ 🤖 "patch a"││
│ └──────────────────────────────────────────────────────────┘│
│ ┌─Status Bar──────────────────────────────────────────────┐│
│ │ 60 FPS │ 1024×1024 │ WebGL2 │ 12 nodes │ 0 errors     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 6.1 | Knob component (SVG, drag, scroll, inertia) | 16h |
| 6.2 | Slider component | 6h |
| 6.3 | XYPad component | 8h |
| 6.4 | Toggle/Switch component | 3h |
| 6.5 | Dropdown/Select component | 4h |
| 6.6 | Cable edge component (color-coded, animated) | 12h |
| 6.7 | Port magnetic snapping | 6h |
| 6.8 | Cable rubber-band physics | 8h |
| 6.9 | Module palette (search, categories, drag-to-add) | 10h |
| 6.10 | Inspector panel (auto-generates from module knobs) | 8h |
| 6.11 | Resizable split panels (react-resizable-panels) | 6h |
| 6.12 | Dark nebula theme polish (glassmorphism, gradients) | 12h |
| 6.13 | Keyboard shortcuts (Del, Ctrl+Z, Space=play, etc.) | 8h |
| 6.14 | Undo/Redo system (Zustand temporal middleware) | 10h |
| 6.15 | Right-click context menus (node, cable, canvas) | 6h |
| 6.16 | Minimap overlay for large patches | 4h |
| 6.17 | Tooltips for all controls | 4h |
| 6.18 | Loading/splash screen with animated logo | 6h |
| 6.19 | Haptic feedback for knobs (Web Vibration API) | 3h |
| 6.20 | Sound design for connections (Web Audio micro-bursts) | 4h |
| 6.21 | Preset browser with preview thumbnails | 10h |
| 6.22 | WaveformDisplay component (oscilloscope style) | 8h |

### Acceptance Criteria
- [ ] Knob interaction feels buttery (60fps, inertia, no jank)
- [ ] Cables animate smoothly, color-coded, magnetic snap
- [ ] Full keyboard workflow possible (no mouse required)
- [ ] Undo/redo works for all actions (infinite stack)
- [ ] Theme is cohesive, dark, glassmorphic, "analog warmth"
- [ ] First-time user can build a patch in <60 seconds

---

## 11. Phase 7 — 3D Volume Rendering (Weeks 27–32) <a name="phase-7"></a>

### Goal
Patch outputs become navigable 3D volumes. Raymarch through density fields, orbit camera, export to GLTF.

### Rendering Approach

```
2D Patch (generates density/color per pixel)
         │
         ▼
    Extend to 3D: All noise functions get z-component from ray position
         │
         ▼
    Raymarch Loop (in fragment shader):
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = rayOrigin + rayDir * t;
        float density = compiledPatchAtPoint(p);  // 3D noise eval
        vec3 color = patchColorAtPoint(p);
        
        // Accumulate (front-to-back compositing)
        accumulated += color * density * stepSize * (1.0 - accumulated.a);
        t += stepSize;
    }
```

### Volume Module Specs

| Module | GLSL Core | Knobs |
|--------|-----------|-------|
| RaymarchAccum | Front-to-back compositing loop | Steps (32-512), StepSize, Absorption, Density Threshold |
| SDFDeform | SDF boolean ops (union, subtract, intersect, smooth blend) | Operation, Smoothness, Scale per operand |
| LightPhase | Directional light with secondary ray march for shadows | Light Dir (vec3), Shadow Steps, Density Scale, Mie G param |
| FogVolume | Exponential height fog | Base Density, Falloff Height, Color |
| CloudDensity | Specialized cloud noise (Worley-Perlin hybrid) | Coverage, Type (cumulus/stratus), Detail |

### Camera System

```typescript
// apps/web/src/components/render/OrbitControls.tsx

// Use @react-three/drei OrbitControls but with custom:
// - Smooth damping (0.05)
// - Auto-rotate toggle (for previewing volumes)
// - Keyboard: WASD for pan, QE for roll
// - Touch: pinch zoom, two-finger pan
// - Snapping to front/side/top views (numpad keys)
```

### Switching 2D ↔ 3D

The same patch graph works in both modes. Difference:
- **2D mode**: `Quad2D.tsx` renders fullscreen plane, noise evaluated at `(uv.x, uv.y, 0.0)`
- **3D mode**: `VolumeBox.tsx` renders unit cube, noise evaluated at `(rayPos.x, rayPos.y, rayPos.z)`

The compiler emits slightly different shader templates but module GLSL stays identical.

### Tasks

| # | Task | Est. |
|---|------|------|
| 7.1 | Raymarch core GLSL template (`volume_frag.glsl`) | 16h |
| 7.2 | VolumeBox.tsx (R3F box mesh + ShaderMaterial) | 8h |
| 7.3 | Camera ray generation in vertex shader | 6h |
| 7.4 | Compiler: 3D mode flag, inject z-coord | 10h |
| 7.5 | All noise chunks: add 3D variants | 12h |
| 7.6 | RaymarchAccum module | 8h |
| 7.7 | SDFDeform module + `sdf_3d.glsl` | 12h |
| 7.8 | LightPhase module + secondary ray march | 12h |
| 7.9 | FogVolume module | 4h |
| 7.10 | CloudDensity module (Worley-Perlin) | 10h |
| 7.11 | OrbitControls integration + keyboard nav | 6h |
| 7.12 | 2D↔3D toggle in UI | 4h |
| 7.13 | LOD system (adaptive step count based on FPS) | 8h |
| 7.14 | Volume export: bake to 3D texture (NIfTI or VDB lite) | 12h |
| 7.15 | GLTF export with baked textures | 10h |
| 7.16 | Environment HDR integration (drei Environment) | 4h |
| 7.17 | Performance: early ray termination, empty space skipping | 8h |

### Acceptance Criteria
- [ ] PerlinVCO → FractalAbs → RaymarchAccum → LightPhase → Output = lit volumetric cloud
- [ ] Orbit around cloud smoothly at 60fps (256 steps on M2)
- [ ] Same patch renders correctly in both 2D and 3D modes
- [ ] LOD automatically reduces steps when FPS drops below 30
- [ ] Export GLTF with baked albedo texture

---

## 12. Phase 8 — AI Co-Pilot Layer (Weeks 33–36) <a name="phase-8"></a>

### Goal
Natural language → patch generation. "Wire a stormy Toronto fog" auto-creates and connects modules.

### Architecture

```
User Prompt: "stormy Toronto fog"
       │
       ▼
┌──────────────────┐
│ Text Embedding    │  ONNX model (all-MiniLM-L6-v2, 22MB)
│ "stormy..."  → 384D vector
└───────┬──────────┘
        │
        ▼
┌──────────────────┐
│ Module Embeddings │  Pre-computed 384D vectors for each module
│ (cosine similarity)│  e.g., "PerlinVCO" ↔ "noise, organic, terrain"
└───────┬──────────┘
        │ Top-K modules
        ▼
┌──────────────────┐
│ Graph Template    │  Rule-based routing:
│ Matching          │  "storm" → CurlNoise + FlowAdvect + DarkPalette
│                   │  "fog" → FogVolume + GodRayScatter
│                   │  Template library of ~50 patterns
└───────┬──────────┘
        │ 
        ▼
┌──────────────────┐
│ Patch Assembly    │  Instantiate modules, auto-wire, set knob presets
│ + Knob Presets    │  "stormy" → high turbulence, dark palette
└───────────────────┘
```

### Implementation

- **NOT** an LLM call (too slow, too expensive for real-time)
- **IS** a semantic search + template matching system
- Module metadata includes semantic tags + embedding vectors
- ~50 "recipe templates" map concept combinations to wiring patterns
- Knob presets per concept ("stormy" = high frequency, high octaves, dark palette)

### Prompt Bay UI
```
┌─ 🤖 Prompt Bay ─────────────────────────┐
│ "wire a stormy fog with god rays"        │
│                                          │
│ Suggested Modules:                       │
│  ✓ CurlNoise  ✓ FogVolume  ✓ GodRay    │
│  ✓ FlowAdvect ✓ ColorMapper             │
│                                          │
│ [Generate Patch] [Modify Existing]       │
│                                          │
│ Or try: "add more turbulence"            │
│         "make it warmer"                 │
│         "add depth with lighting"        │
└──────────────────────────────────────────┘
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 8.1 | Integrate ONNX Runtime Web | 6h |
| 8.2 | Bundle MiniLM model + test embedding generation | 8h |
| 8.3 | Create semantic tag dataset for all modules | 8h |
| 8.4 | Pre-compute module embedding vectors | 4h |
| 8.5 | Cosine similarity search (top-K modules for prompt) | 4h |
| 8.6 | Build 50 recipe templates (JSON pattern library) | 16h |
| 8.7 | Template matcher (concept combo → wiring pattern) | 10h |
| 8.8 | Knob preset library per concept | 8h |
| 8.9 | Patch assembly engine (instantiate + wire + position) | 10h |
| 8.10 | PromptBay UI component | 8h |
| 8.11 | "Modify existing" mode (add to current patch) | 8h |
| 8.12 | Cable suggestion system (highlight compatible ports) | 6h |
| 8.13 | Natural language knob adjustment ("more turbulence" → increase octaves) | 8h |

### Acceptance Criteria
- [ ] "stormy fog" generates a 5-node patch in <2 seconds
- [ ] Generated patch produces visually relevant output immediately
- [ ] "add god rays" modifies existing patch (doesn't replace)
- [ ] Suggestions are contextual (don't suggest generators when chain is full)

---

## 13. Phase 9 — Collaboration & Sync (Weeks 37–39) <a name="phase-9"></a>

### Goal
Multi-user live patching sessions + MIDI/OSC hardware control + BPM sync.

### Collaboration (Yjs CRDT)

```typescript
// Yjs document structure mirrors Zustand graphStore:
const ydoc = new Y.Doc();
const yNodes = ydoc.getArray<GraphNode>('nodes');
const yEdges = ydoc.getArray<GraphEdge>('edges');
const yParams = ydoc.getMap<number>('params');

// Bidirectional sync: Zustand ↔ Yjs
// On local change: graphStore.subscribe → yNodes.push/delete
// On remote change: yNodes.observe → graphStore.setState
// Conflict resolution: CRDT (last-write-wins for params, set-union for nodes/edges)
```

### MIDI Mapping

```typescript
// apps/web/src/hooks/useMIDI.ts

// Flow: MIDI CC message → mapped knob update
// UI: Right-click knob → "MIDI Learn" → move hardware knob → bound
// Storage: midiMap = { [ccNumber]: { nodeId, knobName } }
// Support: Any class-compliant USB MIDI controller
```

### BPM Sync (Tone.js)

```typescript
// apps/web/src/hooks/useAudioSync.ts

// Tone.Transport provides BPM-locked time
// TimeNode module outputs Tone.Transport.seconds (synced)
// Oscillator (LFO) module can lock to BPM subdivisions (1/4, 1/8, etc.)
// Future: Ableton Link via WebSocket bridge
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 9.1 | Integrate Yjs + y-webrtc provider | 8h |
| 9.2 | Bidirectional Zustand ↔ Yjs sync | 12h |
| 9.3 | User presence (cursors, avatars on canvas) | 8h |
| 9.4 | Session management UI (create/join/share link) | 6h |
| 9.5 | WebMIDI integration (CC listener) | 6h |
| 9.6 | MIDI Learn UX (right-click → learn → bound) | 8h |
| 9.7 | MIDI mapping persistence (per-patch) | 4h |
| 9.8 | Tone.js transport integration | 6h |
| 9.9 | BPM-locked LFO subdivisions | 4h |
| 9.10 | OSC input via WebSocket bridge (optional) | 8h |

### Acceptance Criteria
- [ ] Two browsers, same session: one adds a node, other sees it in <500ms
- [ ] Knob twists sync across users in real-time
- [ ] MIDI CC controls knob with <10ms latency
- [ ] LFO syncs to BPM tap (±1ms jitter)

---

## 14. Phase 10 — Export, AR, Marketplace (Weeks 40–44) <a name="phase-10"></a>

### Goal
Production export pipeline, AR integration, community marketplace, Electron desktop wrapper.

### Video Export

```typescript
// apps/web/src/hooks/useExport.ts

// Approach 1: MediaRecorder API (real-time, browser-native)
//   - Capture R3F canvas stream
//   - WebM output (VP9 codec)
//   - Pros: Simple. Cons: WebM only, real-time speed.

// Approach 2: FFmpeg.wasm (offline, higher quality)
//   - Render frames to offscreen FBO at target resolution
//   - Encode each frame as PNG
//   - Feed to FFmpeg.wasm for MP4/H.264 encoding
//   - Pros: Any format, any resolution. Cons: Slow (5-30x real-time).

// Default: MediaRecorder for preview, FFmpeg for final export.
```

### AR Export
- 8th Wall or model-viewer (`<model-viewer>`) for web AR
- Bake 3D volume to mesh (marching cubes on density field)
- Export as GLTF + baked textures → viewable in AR

### Marketplace Architecture

```
┌─ Marketplace ──────────────┐
│ Community Modules:          │
│  🎨 NeonGlow by @artist     │ $1.99
│  🌊 OceanWaves by @dev      │ Free
│  🏔 TerrainKit by @studio   │ $4.99
│                             │
│ Community Presets:          │
│  ☁ Cumulonimbus Pack        │ Free
│  🌌 Deep Space Kit          │ $2.99
│                             │
│ [Upload Module] [Upload Preset]│
└─────────────────────────────┘

Backend: Supabase (auth + storage + DB)
- Auth: Supabase Auth (GitHub/Google OAuth)
- Storage: Supabase Storage for module files + thumbnails
- DB: PostgreSQL for listings, reviews, downloads
- Payments: Stripe Connect (20% platform fee)
```

### Electron Wrapper

```typescript
// apps/electron/main.ts
// Minimal: Load Vite dev server / built web app in BrowserWindow
// Extras: 
//   - Native file system access (save patches locally)
//   - System MIDI (better than WebMIDI on some OS)
//   - Menu bar integration
//   - Auto-update (electron-updater)
```

### Tasks

| # | Task | Est. |
|---|------|------|
| 10.1 | MediaRecorder video export (WebM) | 8h |
| 10.2 | FFmpeg.wasm integration for MP4 | 12h |
| 10.3 | Frame sequence renderer (offscreen FBO loop) | 10h |
| 10.4 | Marching cubes: density → mesh | 16h |
| 10.5 | GLTF export with PBR textures | 8h |
| 10.6 | `<model-viewer>` AR preview | 6h |
| 10.7 | Supabase project setup (auth, DB, storage) | 8h |
| 10.8 | Marketplace browse UI | 12h |
| 10.9 | Module upload flow (validation + review queue) | 12h |
| 10.10 | Stripe Connect integration | 10h |
| 10.11 | Community SDK documentation | 8h |
| 10.12 | Electron scaffold + native file access | 8h |
| 10.13 | Electron auto-updater | 4h |
| 10.14 | Desktop installer (DMG/MSI/AppImage) | 6h |

### Acceptance Criteria
- [ ] Export 30s 1080p MP4 of animated patch
- [ ] View 3D volume in AR on phone (via link)
- [ ] Upload a custom module to marketplace, download on another account
- [ ] Electron app launches, saves patches to disk

---

## 15. Phase 11 — Performance & Accessibility (Ongoing) <a name="phase-11"></a>

### Performance Targets

| Metric | Target | Method |
|--------|--------|--------|
| Shader compile | <100ms | Cache by hash, incremental recompile |
| Knob → render | <16ms (1 frame) | Direct uniform update, no recompile |
| Graph compile | <50ms (20 nodes) | Topological sort + string concat |
| 2D render | 60fps @ 1024² | Single-pass fragment |
| 3D raymarch | 30fps @ 512³ | 128 steps, LOD, early termination |
| Memory | <500MB | Texture atlas, FBO pooling |
| Bundle size | <2MB initial | Code-split modules, lazy load AI |

### Performance Techniques
1. **Shader caching**: Hash compiled GLSL → skip recompile if unchanged
2. **Uniform-only updates**: Knob changes only update uniforms (no recompile)
3. **Topology-aware recompile**: Only recompile subgraph downstream of change
4. **Web Workers**: Shader compilation + module validation off main thread
5. **FBO pooling**: Reuse render targets, max 8 active
6. **LOD for previews**: Node thumbnails render at 64×64, throttled to 15fps
7. **WebGPU compute**: Offload heavy noise precomputation when available

### Accessibility (WCAG 2.2 AA)

| Feature | Implementation |
|---------|---------------|
| Screen reader | ARIA labels on all nodes, ports, knobs. Live region for status. |
| Keyboard nav | Tab through nodes, Enter to select, Arrow keys for knob adjust |
| Color blind | Signal type indicators use shape + color (not color alone) |
| High contrast | Toggle mode: white bg, black nodes, high-contrast cables |
| Reduced motion | `prefers-reduced-motion`: disable cable animations, use static previews |
| Voice control | Web Speech API: "add Perlin node", "connect output to input" |
| Zoom | Full UI scales 50-200%, no breakage |

### Tasks

| # | Task | Est. |
|---|------|------|
| 11.1 | Shader cache implementation | 8h |
| 11.2 | Incremental subgraph recompile | 12h |
| 11.3 | Web Worker for compilation | 10h |
| 11.4 | FBO pool manager | 8h |
| 11.5 | LOD system for node previews | 6h |
| 11.6 | WebGPU feature detect + compute path | 16h |
| 11.7 | ARIA labels for all interactive elements | 10h |
| 11.8 | Full keyboard navigation | 12h |
| 11.9 | High contrast theme | 6h |
| 11.10 | Color-blind safe signal indicators | 4h |
| 11.11 | Reduced motion mode | 4h |
| 11.12 | Performance profiler overlay (dev mode) | 8h |
| 11.13 | Memory leak audit (Chrome DevTools) | 6h |
| 11.14 | Bundle analysis + code splitting | 6h |

---

## 16. Component Registry — Every Module Spec <a name="component-registry"></a>

### Complete Module List (100+ at v1)

#### Generators (14 modules)
| ID | Name | Inputs | Outputs | Knobs | GLSL Chunk |
|----|------|--------|---------|-------|------------|
| `perlin-vco` | Perlin VCO | uv(v2), freqMod(f) | density(f), rgb(v3) | frequency, octaves, lacunarity, gain, seed, amplitude | noise_perlin, noise_fbm |
| `simplex-noise` | Simplex Noise | uv(v2) | density(f), rgb(v3) | frequency, octaves, lacunarity, gain, seed | noise_simplex, noise_fbm |
| `voronoi-cells` | Voronoi Cells | uv(v2) | edges(f), cellId(f), dist(f) | density, jitter, distFunc(enum) | noise_voronoi |
| `worley-noise` | Worley Noise | uv(v2) | f1(f), f2(f), f2mf1(f) | frequency, jitter | noise_worley |
| `value-noise` | Value Noise | uv(v2) | density(f) | amplitude, frequency, layers | noise_value |
| `white-noise` | White Noise | uv(v2) | density(f) | seed | (inline hash) |
| `curl-noise` | Curl Noise | uv(v2) | field(v2), magnitude(f) | frequency, octaves, epsilon | noise_curl |
| `gradient-gen` | Gradient Gen | — | color(v3), alpha(f) | type(enum), angle, offset, scale | (inline) |
| `shape-gen` | Shape Gen | uv(v2) | dist(f), mask(f) | shape(enum), size, roundness, rotation | sdf_2d |
| `checker-grid` | Checker Grid | uv(v2) | mask(f) | scaleX, scaleY, offset | (inline) |
| `brick-pattern` | Brick Pattern | uv(v2) | mask(f), mortar(f) | rows, cols, mortarWidth, offset | (inline) |
| `tile-weave` | Tile Weave | uv(v2) | mask(f), threadId(f) | warpCount, weftCount, gap | (inline) |
| `latent-osc` | Latent Osc | mood(f) | palette(v3), moodCV(f) | timbre, morph, dimension | (AI model) |
| `sample-player` | Sample Player | — | texture(v3), alpha(f) | grainSize, speed, pitch | (texture sample) |

#### Modifiers (15 modules)
| ID | Name | Key Knobs |
|----|------|-----------|
| `domain-warp` | Domain Warp | strength, frequency, octaves |
| `twirl-distort` | Twirl Distort | angle, radius, center |
| `fractal-abs` | Fractal Abs | iterations, threshold, curl |
| `flow-advect` | Flow Advect | strength, vorticity, damping, iterations |
| `bezier-warp` | Bezier Warp | tension, segments, thickness |
| `kaleidoscope` | Kaleidoscope | segments, rotation, offset |
| `polar-coords` | Polar Coords | (toggle: cartesian↔polar) |
| `tile-repeat` | Tile Repeat | tilesX, tilesY, mirror |
| `edge-blur` | Edge Blur | radius, threshold, iterations |
| `sharpen` | Sharpen | amount, radius, threshold |
| `pixelate` | Pixelate | cellSize, shape(square/hex) |
| `posterize` | Posterize | levels |
| `threshold` | Threshold | cutoff, smoothness |
| `invert` | Invert | amount(0-1, for partial invert) |
| `mesh-deform` | Mesh Deform | density, smooth, pinCount |

#### Synthesizers (9 modules)
| ID | Name | Key Feature |
|----|------|-------------|
| `gradient-env` | Gradient Env | ADSR color ramp with draggable stops |
| `mood-adsr` | Mood ADSR | Latent vector interpolation envelope |
| `weight-mixer` | Weight Mixer | Painted multi-layer blend map |
| `phase-vocoder` | Phase Vocoder | FFT spectral morph from audio |
| `color-mapper` | Color Mapper | Value → OKLab LUT |
| `levels-curves` | Levels Curves | Bezier curve → 1D LUT |
| `channel-splitter` | Channel Splitter | vec3 → 3× float |
| `channel-combiner` | Channel Combiner | 3× float → vec3 |
| `time-node` | Time Node | Elapsed / BPM-synced time |

#### FX (10 modules)
| ID | Name | Key Feature |
|----|------|-------------|
| `god-ray-scatter` | God Ray Scatter | Volumetric beams (Henyey-Greenstein) |
| `blend-reverb` | Blend Reverb | 16 Photoshop blend modes + wet/dry |
| `distort-grit` | Distort Grit | Analog clip + tape wow + hiss |
| `edge-enhance` | Edge Enhance | Sobel + unsharp mask |
| `chromatic-aberr` | Chromatic Aberration | RGB channel offset |
| `film-grain` | Film Grain | Photographic noise overlay |
| `vignette` | Vignette | Radial darkening |
| `bloom` | Bloom | Bright-pass + blur |
| `lens-flare` | Lens Flare | Procedural flare elements |
| `analog-drift` | Analog Drift | Frame-to-frame Gaussian jitter |

#### Volumes (5 modules)
| ID | Name | Key Feature |
|----|------|-------------|
| `raymarch-accum` | Raymarch Accum | Density → color along rays |
| `sdf-deform` | SDF Deform | Boolean SDF operations |
| `light-phase` | Light Phase | Directional scattering + shadows |
| `fog-volume` | Fog Volume | Exponential height fog |
| `cloud-density` | Cloud Density | Worley-Perlin cloud specific |

#### Utilities (11 modules)
| ID | Name | Key Feature |
|----|------|-------------|
| `math-op` | Math Op | Add/Mult/Clamp/Remap/Pow/Mod |
| `switch` | Switch | A/B signal selector with crossfade |
| `oscillator` | Oscillator (LFO) | Sin/Saw/Square/Random, BPM-lockable |
| `constant` | Constant | Fixed float/vec value source |
| `uv-coord` | UV Coord | UV source (with transform knobs) |
| `output-node` | Output | Terminal render target |
| `macro-knob` | Macro Knob | Groups multiple knobs into one |
| `randomizer` | Randomizer | Perlin-seeded parameter mutations |
| `recorder` | Recorder | Timeline keyframe capture |
| `ai-router` | AI Router | Semantic cable suggester |
| `comment` | Comment | Text annotation (non-functional) |

**Total: 64 core modules** (remaining 36+ from community/marketplace at launch)

---

## 17. Shader Compilation Pipeline — Deep Dive <a name="shader-pipeline"></a>

### Compilation Flow

```
Graph JSON
    │
    ▼
┌───────────────────┐
│ 1. VALIDATE       │  Type-check all connections
│    - Coercion map │  Insert adapters where needed
│    - Cycle detect │  Reject or mark feedback paths
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 2. SORT           │  Topological order (Kahn's algorithm)
│    - Source nodes  │  Sources first, output last
│    - Feedback FBOs│  Insert FBO read/write for cycles
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 3. COLLECT CHUNKS │  Deduplicate GLSL includes
│    - noise_*.glsl │  Each module declares dependencies
│    - warp_*.glsl  │  Union of all required chunks
│    - etc.         │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 4. GENERATE BODY  │  Walk sorted nodes:
│    For each node: │    - Create scoped variable names
│    - Input vars   │    - Call module.compileGLSL()
│    - Uniform decl │    - Append to body string
│    - GLSL snippet │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 5. ASSEMBLE       │  Combine into complete shader:
│    #version 300 es│    - Precision declarations
│    #includes      │    - Chunk #includes (inlined)
│    uniforms       │    - Uniform declarations
│    void main() {  │    - Main body
│      ...body...   │    - Final output assignment
│    }              │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 6. OPTIMIZE       │  Dead code elimination:
│    - Remove unused│    - Track which vars are read
│    - Fold consts  │    - Remove unread computations
│    - Inline tiny  │    - Constant folding
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ 7. CACHE          │  Hash final string:
│    - SHA-256 hash │    - Check cache before compile
│    - Store program│    - Return cached WebGLProgram
└───────────────────┘
```

### Example: Compiled Shader

For a patch: `UVCoord → PerlinVCO → FractalAbs → ColorMapper → Output`

```glsl
#version 300 es
precision highp float;

// --- Chunks ---
// [noise_perlin.glsl inlined]
// [noise_fbm.glsl inlined]

// --- Uniforms ---
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_n1_frequency;     // PerlinVCO.frequency
uniform float u_n1_octaves;       // PerlinVCO.octaves  
uniform float u_n1_lacunarity;    // PerlinVCO.lacunarity
uniform float u_n1_gain;          // PerlinVCO.gain
uniform float u_n1_seed;          // PerlinVCO.seed
uniform float u_n1_amplitude;     // PerlinVCO.amplitude
uniform float u_n2_iterations;    // FractalAbs.iterations
uniform float u_n2_threshold;     // FractalAbs.threshold
uniform sampler2D u_n3_lut;       // ColorMapper.lut (1D texture)

in vec2 vUv;
out vec4 fragColor;

void main() {
  // --- UVCoord [n0] ---
  vec2 n0_uv = vUv;
  
  // --- PerlinVCO [n1] ---
  vec2 n1_uv = n0_uv * u_n1_frequency;
  float n1_density = fbm(
    n1_uv + vec2(u_n1_seed),
    int(u_n1_octaves),
    u_n1_lacunarity,
    u_n1_gain
  ) * u_n1_amplitude;
  vec3 n1_rgb = vec3(n1_density);
  
  // --- FractalAbs [n2] ---
  float n2_v = n1_density;
  for (int i = 0; i < int(u_n2_iterations); i++) {
    n2_v = abs(n2_v * 2.0 - 1.0);
    if (n2_v < u_n2_threshold) n2_v = 0.0;
  }
  float n2_density = n2_v;
  
  // --- ColorMapper [n3] ---
  vec3 n3_color = texture(u_n3_lut, vec2(n2_density, 0.5)).rgb;
  
  // --- Output [n4] ---
  fragColor = vec4(n3_color, 1.0);
}
```

---

## 18. State Management Schema <a name="state-schema"></a>

### Zustand Store Architecture

```typescript
// Five independent stores (no circular deps):

// 1. GRAPH STORE — Node/edge topology
interface GraphStore {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  outputNodeId: string | null;
  // CRUD actions...
  // Computed: compiledShader (memoized)
}

// 2. PARAM STORE — All knob values (flat for perf)
interface ParamStore {
  values: Map<string, number>;  // key: `${nodeId}.${knobName}`
  setParam: (key: string, value: number) => void;
  batchSet: (updates: [string, number][]) => void;
  // Knob changes here do NOT trigger recompile,
  // only uniform updates (fast path!)
}

// 3. UI STORE — Panel state, selection, zoom
interface UIStore {
  selectedNodeIds: Set<string>;
  hoveredPortId: string | null;
  panelSizes: { palette: number; preview: number; inspector: number };
  zoom: number;
  panOffset: { x: number; y: number };
  activeModal: string | null;
  theme: 'dark' | 'highContrast';
}

// 4. RENDER STORE — Render settings
interface RenderStore {
  mode: '2d' | '3d';
  resolution: [number, number];
  aspectLocked: boolean;
  seamlessMode: boolean;
  isPlaying: boolean;        // Animation running
  bpm: number;
  currentTime: number;       // Seconds
}

// 5. PROJECT STORE — Save/load, undo, metadata
interface ProjectStore {
  name: string;
  lastSaved: Date | null;
  isDirty: boolean;
  undoStack: PatchSnapshot[];
  redoStack: PatchSnapshot[];
  save: () => void;
  load: (json: string) => void;
  undo: () => void;
  redo: () => void;
}
```

### Patch File Format (JSON)

```json
{
  "version": "1.0.0",
  "name": "Stormy Nebula",
  "author": "braden",
  "created": "2026-06-15T12:00:00Z",
  "render": {
    "mode": "3d",
    "resolution": [1024, 1024],
    "bpm": 120
  },
  "nodes": [
    {
      "id": "n0",
      "moduleId": "uv-coord",
      "position": { "x": 100, "y": 200 },
      "knobs": {}
    },
    {
      "id": "n1",
      "moduleId": "perlin-vco",
      "position": { "x": 350, "y": 200 },
      "knobs": {
        "frequency": 6.5,
        "octaves": 8,
        "lacunarity": 2.1,
        "gain": 0.45,
        "seed": 42,
        "amplitude": 1.2
      }
    }
  ],
  "edges": [
    {
      "id": "e0",
      "source": "n0",
      "sourcePort": "uv",
      "target": "n1",
      "targetPort": "uv"
    }
  ],
  "outputNodeId": "n4",
  "midiMap": {
    "cc1": { "nodeId": "n1", "knob": "frequency" }
  },
  "timeline": {
    "duration": 30,
    "keyframes": [
      { "time": 0, "param": "n1.frequency", "value": 4, "easing": "easeInOut" },
      { "time": 15, "param": "n1.frequency", "value": 12, "easing": "easeInOut" }
    ]
  }
}
```

---

## 19. Testing Strategy <a name="testing"></a>

### Test Pyramid

| Level | Tool | Count (MVP) | Scope |
|-------|------|-------------|-------|
| Unit | Vitest | ~300 | Module compilation, topology, coercion, math |
| Integration | Vitest + happy-dom | ~80 | Store actions → state updates → compiled output |
| Visual | Playwright + screenshot | ~50 | Shader output matches golden images |
| E2E | Playwright | ~30 | Full user flows (add node → wire → see render) |
| Perf | Lighthouse CI | 5 | FPS, bundle size, compile time budgets |

### Critical Test Cases

```typescript
// packages/core/__tests__/compiler.test.ts

describe('Shader Compiler', () => {
  it('compiles UV → Output to valid GLSL', () => { ... });
  it('handles float → vec3 coercion automatically', () => { ... });
  it('detects and rejects graph cycles', () => { ... });
  it('detects feedback loops and inserts FBO ping-pong', () => { ... });
  it('caches identical shader compilations', () => { ... });
  it('generates unique variable names (no collisions)', () => { ... });
  it('compiles 50-node graph in <100ms', () => { ... });
  it('handles disconnected subgraphs gracefully', () => { ... });
});

describe('Module: PerlinVCO', () => {
  it('outputs valid GLSL snippet', () => { ... });
  it('respects all knob ranges', () => { ... });
  it('declares correct chunks', () => { ... });
});
```

### Visual Regression

```typescript
// apps/web/e2e/visual.spec.ts

test('perlin noise matches golden image', async ({ page }) => {
  await page.goto('/');
  await loadPatch(page, 'test-patches/perlin-basic.json');
  await page.waitForTimeout(500); // Render settle
  const screenshot = await page.locator('#preview-canvas').screenshot();
  expect(screenshot).toMatchSnapshot('perlin-basic.png', { threshold: 0.01 });
});
```

---

## 20. Risk Register & Mitigations <a name="risks"></a>

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | Shader compile too slow for large graphs | High | High | Cache aggressively, incremental recompile, Web Worker |
| R2 | WebGL2 limitations (no compute shaders) | Medium | Medium | Design for WebGL2 first, WebGPU as progressive enhancement |
| R3 | ReactFlow performance with 100+ nodes | Medium | High | Virtualization, collapse subgraphs, LOD for off-screen nodes |
| R4 | Cross-browser shader inconsistencies | High | Medium | ANGLE-aware testing, avoid GPU-specific extensions |
| R5 | Memory leaks from FBO/texture churn | Medium | High | Pool FBOs, explicit dispose, WeakRef for textures |
| R6 | AI semantic search quality too low | Medium | Low | Supplement with keyword fallback, user can manual-wire |
| R7 | Yjs CRDT merge conflicts break patches | Low | High | Extensive conflict resolution tests, "fork" option |
| R8 | Mobile performance unacceptable | High | Medium | Mobile: preview-only mode (256², 30fps), no 3D |
| R9 | Scope creep delays MVP | High | High | Strict phase gates, MVP = 2D only + 20 modules |
| R10 | Community SDK security (malicious modules) | Medium | High | Sandbox modules in iframe/worker, code review queue |

---

## 21. Team & Roles <a name="team"></a>

| Role | Count | Focus | Key Skills |
|------|-------|-------|------------|
| **Tech Lead / Architect** | 1 | Architecture, compiler, performance | R3F, GLSL, graph theory |
| **R3F / Shader Dev** | 1 | Render pipeline, all GLSL chunks, 3D volumes | Three.js, raymarching, WebGL |
| **Core Platform Dev** | 1 | Graph engine, state management, exports | TypeScript, Zustand, algorithms |
| **UI/UX Dev** | 1 | All components, ReactFlow integration, controls | React, CSS, animation, a11y |
| **Designer** | 1 (part-time) | Theme, module skins, marketing, icons | Figma, motion design |
| **AI/ML Engineer** | 1 (Phase 8, contract) | Semantic routing, embeddings | ONNX, NLP, Python |

### Hiring Priority (if budget allows)
1. R3F/Shader Dev — **critical path** (GLSL chunks + compiler)
2. Core Platform Dev — **critical path** (graph engine)
3. UI/UX Dev — needed by Phase 6 but can start earlier
4. AI Engineer — only needed Phase 8+

---

## 22. Milestone Gates & Success Criteria <a name="milestones"></a>

### Gate Reviews (Go/No-Go)

| Gate | Date | Criteria | Go = |
|------|------|----------|------|
| **G0: Foundation** | Week 3 | Dev env works, all packages build, CI green | Proceed to Phase 1 |
| **G1: Engine** | Week 8 | UV → Output renders, save/load works | Proceed to Phase 2 |
| **G2: Generators** | Week 12 | 14 generators work, per-node preview | Internal alpha |
| **G3: Modifiers+FX** | Week 16 | 25 modifier/FX modules, complex patches possible | Internal alpha 2 |
| **G4: MVP** | Week 22 | 2D export, full UI polish, 50+ modules | **External alpha** (10 testers) |
| **G5: 3D** | Week 32 | Volume rendering, orbit camera, GLTF export | **Public beta** |
| **G6: AI** | Week 36 | Prompt → patch generation working | Beta feature flag |
| **G7: Collab** | Week 39 | Multi-user sessions, MIDI working | Beta expansion |
| **G8: Launch** | Week 44 | Marketplace, exports, Electron | **v1.0 Launch** 🚀 |

### KPIs (Year 1)

| Metric | Target |
|--------|--------|
| Registered users | 50,000 |
| Monthly active users | 10,000 |
| Patches created | 500,000 |
| Community modules uploaded | 200 |
| Pro subscriptions | 2,000 ($120K ARR) |
| Marketplace GMV | $50K |
| NPS score | >40 |

### Launch Event (Toronto, Q4 2026)
- **Venue**: MUTEK Toronto or Artscape Digital Hub
- **Format**: Live demo + VJ performance using TextureSynth
- **Ticket**: $20, cap 200, includes 3-month Pro trial
- **Press**: Hacker News, Creative Applications, CDM (Create Digital Music)
- **Collab**: Local modular synth community (Modcan, Toronto Synth Meet)

---

## Appendix A: Sprint Mapping (44 Weeks)

```
W01 ████ Phase 0: Foundation
W02 ████
W03 ████
W04 ████ Phase 1: Patch Engine
W05 ████
W06 ████ ← GLSL Compiler (hardest part)
W07 ████
W08 ████ ← GATE G1
W09 ████ Phase 2: Generators
W10 ████
W11 ████
W12 ████ ← GATE G2 (Internal Alpha)
W13 ████ Phase 3: Modifiers + FX
W14 ████
W15 ████
W16 ████ ← GATE G3
W17 ████ Phase 4: Synthesizers
W18 ████
W19 ████
W20 ████ Phase 5: 2D Render Pipeline
W21 ████
W22 ████ ← GATE G4 (MVP / External Alpha!)
W23 ████ Phase 6: UI/UX Polish
W24 ████
W25 ████
W26 ████
W27 ████ Phase 7: 3D Volumes
W28 ████
W29 ████
W30 ████
W31 ████
W32 ████ ← GATE G5 (Public Beta)
W33 ████ Phase 8: AI Co-Pilot
W34 ████
W35 ████
W36 ████ ← GATE G6
W37 ████ Phase 9: Collaboration
W38 ████
W39 ████ ← GATE G7
W40 ████ Phase 10: Export, AR, Marketplace
W41 ████
W42 ████
W43 ████
W44 ████ ← GATE G8 (v1.0 LAUNCH 🚀)
```

## Appendix B: Dependency Graph (Phase Order)

```
Phase 0 (Foundation)
   │
   ▼
Phase 1 (Patch Engine) ◄── CRITICAL PATH START
   │
   ├──▶ Phase 2 (Generators)
   │       │
   │       ▼
   │    Phase 3 (Modifiers/FX)
   │       │
   │       ▼
   │    Phase 4 (Synthesizers)
   │       │
   │       ▼
   │    Phase 5 (2D Pipeline) ◄── MVP GATE
   │       │
   │       ├──▶ Phase 7 (3D Volumes)
   │       │       │
   │       │       ▼
   │       │    Phase 10 (Export/AR)
   │       │
   │       └──▶ Phase 8 (AI) ──▶ Phase 9 (Collab)
   │
   └──▶ Phase 6 (UI Polish) ← runs parallel to 4/5
                │
                ▼
            Phase 11 (Perf/A11y) ← continuous
```

## Appendix C: Quick Reference — First 5 Patches to Build for Testing

| # | Patch Name | Modules Used | Tests |
|---|-----------|-------------|-------|
| 1 | **Hello Gradient** | UVCoord → Output | Pipeline works at all |
| 2 | **Perlin Clouds** | UVCoord → PerlinVCO → Output | First noise, knob control |
| 3 | **Warped Marble** | UV → Perlin → DomainWarp → Voronoi → ColorMapper → Out | Multi-node chain |
| 4 | **Pulsing Nebula** | UV → Perlin → FractalAbs → LFO(→freq CV) → GodRay → Out | CV modulation + time |
| 5 | **Storm Volume** | UV → Curl → FlowAdvect → RaymarchAccum → LightPhase → Out | Full 3D pipeline |

---

*This document is the single source of truth for TextureSynth development. Update it as decisions evolve. Every PR should reference a task number from this plan.*

**Let's patch the future. ⟡**