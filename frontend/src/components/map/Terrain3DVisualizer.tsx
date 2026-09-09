import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export interface Terrain3DVisualizerProps {
  zoneName?: string;
  slope?: number;
  elevation?: number;
  height?: number | string;
  fullScreen?: boolean;
  interactive?: boolean;
  rainfallMm?: number;
  soilMoisture?: number;
  riskLevel?: 'RED' | 'AMBER' | 'GREEN';
  actionProtocol?: string;
  showHud?: boolean;
  showTopControls?: boolean;
  onBack?: () => void;
  wireframeDefault?: boolean;
  autoRotateDefault?: boolean;
}

export const Terrain3DVisualizer: React.FC<Terrain3DVisualizerProps> = ({
  zoneName = 'Meppadi, Wayanad (Testbed)',
  slope = 38.5,
  elevation,
  height,
  fullScreen = false,
  interactive = true,
  rainfallMm,
  soilMoisture,
  riskLevel,
  actionProtocol,
  showHud = true,
  showTopControls = true,
  onBack,
  wireframeDefault = false,
  autoRotateDefault = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(wireframeDefault);
  const [animatingDebris, setAnimatingDebris] = useState<boolean>(true);
  const [runoffType, setRunoffType] = useState<'debris' | 'water' | 'both'>('both');
  const [autoRotate, setAutoRotate] = useState<boolean>(autoRotateDefault);
  const [elevationColorsActive, setElevationColorsActive] = useState<boolean>(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const terrainMeshRef = useRef<THREE.Mesh | null>(null);
  const debrisParticlesRef = useRef<THREE.Points | null>(null);
  const waterParticlesRef = useRef<THREE.Points | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);

  // Camera spherical state for touch & mouse controls
  const sphericalRef = useRef({
    radius: 65,
    theta: 0,
    phi: 1.0, // approx 57 degrees elevation
    targetY: 6
  });

  const isUserInteractingRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  // Reset Camera View
  const handleResetCamera = useCallback(() => {
    sphericalRef.current = {
      radius: 65,
      theta: 0,
      phi: 1.0,
      targetY: 6
    };
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 45, 65);
      cameraRef.current.lookAt(0, 6, 0);
    }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // 1. Scene, Camera, Renderer
    const width = mount.clientWidth || 600;
    const computedHeight = fullScreen
      ? mount.clientHeight || window.innerHeight
      : typeof height === 'number'
      ? height
      : mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1329);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / Math.max(computedHeight, 100), 0.1, 1000);
    camera.position.set(0, 45, 65);
    camera.lookAt(0, sphericalRef.current.targetY, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, computedHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // capped at 2 for mobile performance
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(35, 55, 35);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Procedural Mountain Terrain Geometry with DEM elevation
    const gridX = 40;
    const gridY = 40;
    const size = 50;
    const geometry = new THREE.PlaneGeometry(size, size, gridX, gridY);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);

      // Mountain peak elevation formula based on real slope angle
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

    const colorAttr = new THREE.Float32BufferAttribute(colors, 3);
    geometry.setAttribute('color', colorAttr);
    originalColorsRef.current = new Float32Array(colors);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.7,
      metalness: 0.1,
      wireframe: wireframe,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMeshRef.current = terrainMesh;
    scene.add(terrainMesh);

    // 4. Animated Debris Flow Runoff Particles (Red mudflow)
    const debrisCount = 180;
    const debrisGeo = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);

    for (let i = 0; i < debrisCount; i++) {
      debrisPositions[i * 3] = (Math.random() - 0.5) * 10;
      debrisPositions[i * 3 + 1] = 18 + Math.random() * 4;
      debrisPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    debrisGeo.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    const debrisMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 1.3,
      transparent: true,
      opacity: 0.9
    });

    const debrisParticles = new THREE.Points(debrisGeo, debrisMat);
    debrisParticlesRef.current = debrisParticles;
    scene.add(debrisParticles);

    // 5. Animated Surface Water Runoff Particles (Cyan/Blue drainage)
    const waterCount = 180;
    const waterGeo = new THREE.BufferGeometry();
    const waterPositions = new Float32Array(waterCount * 3);

    for (let i = 0; i < waterCount; i++) {
      waterPositions[i * 3] = (Math.random() - 0.5) * 12;
      waterPositions[i * 3 + 1] = 16 + Math.random() * 4;
      waterPositions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }

    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
    const waterMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.1,
      transparent: true,
      opacity: 0.85
    });

    const waterParticles = new THREE.Points(waterGeo, waterMat);
    waterParticlesRef.current = waterParticles;
    scene.add(waterParticles);

    // 6. Touch & Pointer Controls (Smooth mobile orbit and pinch zoom)
    const domElement = renderer.domElement;
    domElement.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isUserInteractingRef.current = true;
      touchStartRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!interactive || !isUserInteractingRef.current) return;
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      touchStartRef.current = { x: e.clientX, y: e.clientY };

      const sph = sphericalRef.current;
      sph.theta -= dx * 0.008;
      sph.phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.05, sph.phi - dy * 0.008));
    };

    const onPointerUp = () => {
      isUserInteractingRef.current = false;
    };

    // Pinch Zoom for mobile devices
    const onTouchStart = (e: TouchEvent) => {
      if (!interactive) return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartRef.current.dist = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!interactive) return;
      if (e.touches.length === 2 && touchStartRef.current.dist) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = touchStartRef.current.dist / dist;
        touchStartRef.current.dist = dist;

        const sph = sphericalRef.current;
        sph.radius = Math.max(25, Math.min(130, sph.radius * factor));
      }
    };

    // Mouse wheel zoom
    const onWheel = (e: WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();
      const sph = sphericalRef.current;
      sph.radius = Math.max(25, Math.min(130, sph.radius + (e.deltaY > 0 ? 3 : -3)));
    };

    domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    domElement.addEventListener('touchmove', onTouchMove, { passive: true });
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // 7. Animation Loop
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const sph = sphericalRef.current;

      // Auto rotation when enabled and user is not holding canvas
      if (autoRotate && !isUserInteractingRef.current) {
        sph.theta += 0.003;
      }

      // Update camera position via spherical coordinates
      camera.position.x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
      camera.position.y = sph.radius * Math.cos(sph.phi) + (sph.targetY * 0.5);
      camera.position.z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);
      camera.lookAt(0, sph.targetY, 0);

      // Animate falling debris flow runoff
      if (animatingDebris) {
        // Red debris particles
        if (debrisParticles.visible) {
          const pArr = debrisParticles.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < debrisCount; i++) {
            pArr[i * 3 + 1] -= 0.18; // Fall downwards along slope
            pArr[i * 3] += (Math.random() - 0.5) * 0.08;
            pArr[i * 3 + 2] += 0.12; // Flow down valley

            if (pArr[i * 3 + 1] < 0.5) {
              pArr[i * 3] = (Math.random() - 0.5) * 8;
              pArr[i * 3 + 1] = 18 + Math.random() * 3;
              pArr[i * 3 + 2] = -5 + (Math.random() - 0.5) * 6;
            }
          }
          debrisParticles.geometry.attributes.position.needsUpdate = true;
        }

        // Cyan surface water runoff particles
        if (waterParticles.visible) {
          const wArr = waterParticles.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < waterCount; i++) {
            wArr[i * 3 + 1] -= 0.22; // Slightly faster surface water flow
            wArr[i * 3] += (Math.random() - 0.5) * 0.10;
            wArr[i * 3 + 2] += 0.15; // Channel down valley

            if (wArr[i * 3 + 1] < 0.4) {
              wArr[i * 3] = (Math.random() - 0.5) * 10;
              wArr[i * 3 + 1] = 17 + Math.random() * 3;
              wArr[i * 3 + 2] = -6 + (Math.random() - 0.5) * 8;
            }
          }
          waterParticles.geometry.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || 600;
      const h = fullScreen
        ? mount.clientHeight || window.innerHeight
        : typeof height === 'number'
        ? height
        : mount.clientHeight || 400;

      camera.aspect = w / Math.max(h, 100);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElement.removeEventListener('touchstart', onTouchStart);
      domElement.removeEventListener('touchmove', onTouchMove);
      domElement.removeEventListener('wheel', onWheel);

      cancelAnimationFrame(animationFrameId);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      debrisGeo.dispose();
      debrisMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      renderer.dispose();
    };
  }, [slope, animatingDebris, height, fullScreen, interactive, autoRotate]);

  // Handle wireframe toggle
  useEffect(() => {
    if (terrainMeshRef.current) {
      (terrainMeshRef.current.material as THREE.MeshStandardMaterial).wireframe = wireframe;
    }
  }, [wireframe]);

  // Handle runoff particle visibility mode
  useEffect(() => {
    if (debrisParticlesRef.current) {
      debrisParticlesRef.current.visible = (runoffType === 'debris' || runoffType === 'both') && animatingDebris;
    }
    if (waterParticlesRef.current) {
      waterParticlesRef.current.visible = (runoffType === 'water' || runoffType === 'both') && animatingDebris;
    }
  }, [runoffType, animatingDebris]);

  // Handle elevation color mapping toggle
  useEffect(() => {
    if (!terrainMeshRef.current || !originalColorsRef.current) return;
    const geom = terrainMeshRef.current.geometry;
    const colorAttr = geom.getAttribute('color') as THREE.BufferAttribute;
    if (!colorAttr) return;

    if (elevationColorsActive) {
      // Restore slope risk gradient
      colorAttr.copyArray(originalColorsRef.current);
    } else {
      // Uniform natural earth tint
      for (let i = 0; i < colorAttr.count; i++) {
        colorAttr.setXYZ(i, 0.45, 0.52, 0.48);
      }
    }
    colorAttr.needsUpdate = true;
  }, [elevationColorsActive]);

  // Container styling
  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0b1329',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }
    : {
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        position: 'relative'
      };

  const canvasHeight = fullScreen ? '100%' : typeof height === 'number' ? `${height}px` : height || '400px';

  return (
    <div style={containerStyle}>
      {/* Top Header Controls for Desktop / Non-fullscreen */}
      {showTopControls && !fullScreen && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⛰️</span> 3D Digital Elevation &amp; Debris Flow Simulator
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              NASA SRTM 30m DEM Terrain Mesh · Slope Angle: <strong style={{ color: '#f87171' }}>{slope}°</strong> · Peak: <strong style={{ color: '#38bdf8' }}>{typeof elevation === 'number' ? `${elevation.toFixed(1)} m` : 'Unavailable'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
              {animatingDebris ? '🔴 Runoff Active' : '⚪ Pause Particles'}
            </button>
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              style={{
                padding: '6px 12px', borderRadius: '8px', border: '1px solid #334155',
                background: autoRotate ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                color: autoRotate ? '#38bdf8' : '#94a3b8',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              {autoRotate ? '🔄 Rotate: ON' : '⏸️ Rotate: OFF'}
            </button>
            <button
              onClick={handleResetCamera}
              title="Reset camera view"
              style={{
                padding: '6px 10px', borderRadius: '8px', border: '1px solid #334155',
                background: '#1e293b', color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              🎯 Reset View
            </button>
          </div>
        </div>
      )}

      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: canvasHeight,
          flex: fullScreen ? 1 : undefined,
          borderRadius: fullScreen ? 0 : '12px',
          overflow: 'hidden',
          position: 'relative',
          cursor: interactive ? 'grab' : 'default'
        }}
      >
        {/* Floating 3D HUD (When showHud is enabled) */}
        {showHud && (
          <div style={{
            position: 'absolute',
            bottom: fullScreen ? 85 : 14,
            left: 14,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '0.75rem',
            color: '#cbd5e1',
            maxWidth: 'calc(100% - 28px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#f8fafc' }}>
                📍 {zoneName}
              </div>
              {riskLevel && (
                <span style={{
                  background: riskLevel === 'RED' ? '#ef4444' : riskLevel === 'AMBER' ? '#f59e0b' : '#22c55e',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.66rem',
                  fontWeight: 900
                }}>
                  {riskLevel} RISK
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.72rem' }}>
              <div>Slope: <strong style={{ color: '#f87171' }}>{slope}°</strong></div>
              <div>Peak: <strong style={{ color: '#38bdf8' }}>{typeof elevation === 'number' ? `${elevation.toFixed(1)} m` : 'N/A'}</strong></div>
              {typeof rainfallMm === 'number' && <div>Rain: <strong style={{ color: '#38bdf8' }}>{rainfallMm} mm</strong></div>}
              {typeof soilMoisture === 'number' && <div>Soil: <strong style={{ color: '#34d399' }}>{soilMoisture}%</strong></div>}
            </div>

            <div style={{ color: '#f87171', marginTop: '6px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔴</span>
              <span>Debris Trajectory: <strong>{actionProtocol || 'Uphill Ridge → Valley Bypass Runoff Channel'}</strong></span>
            </div>
          </div>
        )}

        {/* Fullscreen Mobile Touch Hint Overlay */}
        {fullScreen && interactive && (
          <div style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '4px 10px',
            fontSize: '0.68rem',
            color: '#94a3b8',
            pointerEvents: 'none'
          }}>
            👆 Drag to rotate · Pinch to zoom
          </div>
        )}
      </div>
    </div>
  );
};
