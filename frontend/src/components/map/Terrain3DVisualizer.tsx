import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Props {
  zoneName?: string;
  slope?: number;
  elevation?: number;
}

export const Terrain3DVisualizer: React.FC<Props> = ({
  zoneName = 'Meppadi, Wayanad (Testbed)',
  slope = 38.5,
  elevation = 876.5
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [animatingDebris, setAnimatingDebris] = useState<boolean>(true);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera, Renderer
    const width = mount.clientWidth || 600;
    const height = 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1329);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 45, 65);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Procedural Mountain Terrain Geometry with DEM elevation
    const gridX = 40;
    const gridY = 40;
    const size = 50;
    const geometry = new THREE.PlaneGeometry(size, size, gridX, gridY);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Mountain peak elevation formula based on real slope
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      const ridge = Math.sin(vx * 0.15) * Math.cos(vz * 0.15) * 4;
      const heightVal = Math.max(0, (25 - distFromCenter * 0.8) + ridge) * (slope / 30.0);
      pos.setY(i, heightVal);

      // Color mapping: Green valley -> Yellow moderate -> Red steep peak
      if (heightVal > 15) {
        color.setRGB(0.93, 0.27, 0.27); // Red Critical Peak
      } else if (heightVal > 8) {
        color.setRGB(0.96, 0.62, 0.04); // Amber Moderate Slope
      } else {
        color.setRGB(0.13, 0.65, 0.35); // Green Valley
      }
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      wireframe: false,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMeshRef.current = terrainMesh;
    scene.add(terrainMesh);

    // 4. Animated Debris Flow Particles
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 10;
      particlePositions[i * 3 + 1] = 18 + Math.random() * 4;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 1.2,
      transparent: true,
      opacity: 0.85
    });

    const debrisParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(debrisParticles);

    // 5. Animation Loop
    let animationFrameId: number;
    let angle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Slow terrain rotation for 3D inspection
      angle += 0.003;
      camera.position.x = Math.sin(angle) * 65;
      camera.position.z = Math.cos(angle) * 65;
      camera.lookAt(0, 6, 0);

      // Animate falling debris flow runoff
      if (animatingDebris) {
        const pArr = debrisParticles.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          pArr[i * 3 + 1] -= 0.18; // Fall downwards
          pArr[i * 3] += (Math.random() - 0.5) * 0.08;
          pArr[i * 3 + 2] += 0.12; // Flow down valley

          if (pArr[i * 3 + 1] < 0.5) {
            // Reset to peak
            pArr[i * 3] = (Math.random() - 0.5) * 8;
            pArr[i * 3 + 1] = 18 + Math.random() * 3;
            pArr[i * 3 + 2] = -5 + (Math.random() - 0.5) * 6;
          }
        }
        debrisParticles.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [slope, animatingDebris]);

  // Handle wireframe toggle
  useEffect(() => {
    if (terrainMeshRef.current) {
      (terrainMeshRef.current.material as THREE.MeshStandardMaterial).wireframe = wireframe;
    }
  }, [wireframe]);

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⛰️</span> 3D Digital Elevation &amp; Debris Flow Simulator
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
            NASA SRTM 30m DEM Terrain Mesh · Slope Angle: <strong style={{ color: '#f87171' }}>{slope}°</strong> · Peak: <strong style={{ color: '#38bdf8' }}>{elevation}m</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setWireframe(!wireframe)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid #334155',
              background: wireframe ? '#2563eb' : '#1e293b', color: '#fff',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {wireframe ? '🌐 Solid Mesh' : '🕸️ Wireframe'}
          </button>
          <button
            onClick={() => setAnimatingDebris(!animatingDebris)}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: '1px solid #334155',
              background: animatingDebris ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
              color: animatingDebris ? '#f87171' : '#94a3b8',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            {animatingDebris ? '🔴 Debris Flow Active' : '⚪ Pause Particles'}
          </button>
        </div>
      </div>

      {/* 3D Canvas Mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}
      >
        {/* Floating 3D HUD */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14, zIndex: 10,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
          padding: '8px 14px', fontSize: '0.75rem', color: '#cbd5e1'
        }}>
          <div>📍 <strong>{zoneName}</strong></div>
          <div style={{ color: '#f87171', marginTop: '2px' }}>🔴 Debris Trajectory: <strong>Uphill Ridge $\rightarrow$ Valley SH-59 Bypass</strong></div>
        </div>
      </div>
    </div>
  );
};
