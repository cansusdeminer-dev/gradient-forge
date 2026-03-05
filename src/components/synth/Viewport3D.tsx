// Alchemy Studio — 3D Viewport (Whitepaper §8.1)

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Resource, MeshResource, MaterialResource } from '@/lib/types';

function MeshObject({ mesh, material }: { mesh: MeshResource; material?: MaterialResource | null }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    if (mesh.vertices.length === 0) return geo;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
    if (mesh.indices.length > 0) geo.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    return geo;
  }, [mesh]);

  const mat = useMemo(() => {
    if (material) {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(material.color[0] / 255, material.color[1] / 255, material.color[2] / 255),
        roughness: material.roughness,
        metalness: material.metalness,
        ...(material.emissive ? {
          emissive: new THREE.Color(material.emissive[0] / 255, material.emissive[1] / 255, material.emissive[2] / 255),
          emissiveIntensity: 1,
        } : {}),
        side: THREE.DoubleSide,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0x6ab0e0,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
  }, [material]);

  if (mesh.vertices.length === 0) return null;

  return <mesh geometry={geometry} material={mat} />;
}

function GridFloor() {
  return (
    <gridHelper args={[6, 12, 0x333344, 0x222233]} rotation={[0, 0, 0]} />
  );
}

interface Viewport3DProps {
  resource: Resource;
}

const Viewport3D: React.FC<Viewport3DProps> = ({ resource }) => {
  const mesh = resource.type === 'mesh' ? resource :
    resource.type === 'scene3d' ? resource.mesh : null;
  const material = resource.type === 'scene3d' ? resource.material : null;

  return (
    <div className="w-full h-full" style={{ minHeight: 200 }}>
      <Canvas
        camera={{ position: [2.5, 2, 2.5], fov: 45 }}
        style={{ background: '#080812' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.9} castShadow />
        <directionalLight position={[-3, -1, -3]} intensity={0.25} color="#6080ff" />
        <pointLight position={[0, 3, 0]} intensity={0.3} color="#40e0d0" />
        {mesh && <MeshObject mesh={mesh} material={material} />}
        <GridFloor />
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={1}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
};

export default Viewport3D;
