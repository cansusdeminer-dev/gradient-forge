// Alchemy Studio — Typed Resource System (Whitepaper §3.1)

export interface Field2DResource { type: 'field2d'; data: ImageData; }
export interface MeshResource { type: 'mesh'; vertices: Float32Array; normals: Float32Array; indices: Uint32Array; }
export interface SDF3DResource { type: 'sdf3d'; evaluate: (x: number, y: number, z: number) => number; bounds: [number, number, number, number, number, number]; }
export interface MaterialResource { type: 'material'; color: [number, number, number]; roughness: number; metalness: number; emissive?: [number, number, number]; }
export interface Scene3DResource { type: 'scene3d'; mesh: MeshResource | null; material: MaterialResource | null; }

export type Resource = Field2DResource | MeshResource | SDF3DResource | MaterialResource | Scene3DResource;
