import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Room } from '../types';
import {
  Maximize2,
  Minimize2,
  Compass,
  RotateCw,
  Sun,
  Sunset,
  Eye,
  Grid,
  Layers,
  ChevronDown,
  ChevronUp,
  Bed,
  Users,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';

interface Room3DViewerProps {
  room: Room;
  onBookRoom: (room: Room) => void;
  onClose?: () => void;
}

export const Room3DViewer: React.FC<Room3DViewerProps> = ({ room, onBookRoom, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'perspective' | 'topDown' | 'balcony' | 'bed'>('perspective');
  const [lightingPreset, setLightingPreset] = useState<'daylight' | 'sunset'>('daylight');
  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [isFloorPlanMode, setIsFloorPlanMode] = useState<boolean>(false);

  // References for camera transition and scene manipulation
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(7, 5, 8));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const currentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 1, 0));
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);

  // Drag interaction state
  const isDragging = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraSpherical = useRef<{ radius: number; theta: number; phi: number }>({
    radius: 11,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  });

  const isCityView = room.viewType === 'city';
  const hasBalcony = room.category.toLowerCase().includes('balcony') || isCityView || room.amenities.some(a => a.toLowerCase().includes('balcony'));

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 460;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(lightingPreset === 'sunset' ? 0x1f1924 : 0xf8fafc);
    scene.fog = new THREE.FogExp2(lightingPreset === 'sunset' ? 0x221a28 : 0xf1f5f9, 0.035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(7, 5.5, 8.5);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // 3. Renderer with Software WebGL Check & PBR Setup
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = lightingPreset === 'sunset' ? 1.25 : 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfff6e8, 0x94a3b8, 0.7);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const keyLight = new THREE.DirectionalLight(0xffeedd, 1.4);
    keyLight.position.set(6, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    // 5. Build Procedural 3D Room Model (Group of 3-12 parts)
    const roomGroup = new THREE.Group();
    materialsRef.current = [];

    // Helper material registrar
    const createMaterial = (params: THREE.MeshStandardMaterialParameters) => {
      const mat = new THREE.MeshStandardMaterial({
        ...params,
        wireframe: showWireframe
      });
      materialsRef.current.push(mat);
      return mat;
    };

    // A. Floor (Warm wooden parquet styling)
    const floorGeo = new THREE.PlaneGeometry(6.4, 5.4);
    const floorMat = createMaterial({
      color: 0xc89b6d,
      roughness: 0.35,
      metalness: 0.05
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    // B. Base Floor Grid Lines (for layout clarity)
    const gridHelper = new THREE.GridHelper(6.4, 12, 0xb45309, 0xd6d3d1);
    gridHelper.position.y = 0.005;
    roomGroup.add(gridHelper);

    // C. Back Wall
    const backWallGeo = new THREE.BoxGeometry(6.4, 3.0, 0.15);
    const wallMat = createMaterial({
      color: 0xfaf5ef,
      roughness: 0.85
    });
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, 1.5, -2.7);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // D. Left Wall with Bathroom Door Cutout
    const leftWallGeo = new THREE.BoxGeometry(0.15, 3.0, 5.4);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-3.2, 1.5, 0);
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // E. Right Wall with Large Sunlit Window View
    const rightWallGeo = new THREE.BoxGeometry(0.15, 3.0, 5.4);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(3.2, 1.5, 0);
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Window Frame & Scrim (Highlighting City View or Mountain Ridge)
    const windowFrameGeo = new THREE.BoxGeometry(0.2, 1.8, 2.6);
    const windowFrameMat = createMaterial({ color: 0x334155, roughness: 0.3 });
    const windowFrame = new THREE.Mesh(windowFrameGeo, windowFrameMat);
    windowFrame.position.set(3.18, 1.7, 0);
    roomGroup.add(windowFrame);

    // Window Scrim Texture Glass
    const windowGlassGeo = new THREE.PlaneGeometry(2.4, 1.6);
    const windowGlassMat = createMaterial({
      color: isCityView ? 0x93c5fd : 0x86efac,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1
    });
    const windowGlass = new THREE.Mesh(windowGlassGeo, windowGlassMat);
    windowGlass.rotation.y = -Math.PI / 2;
    windowGlass.position.set(3.1, 1.7, 0);
    roomGroup.add(windowGlass);

    // F. Bed Assembly (3-piece group: Base, Mattress, Headboard, Pillows, Duvet)
    const bedGroup = new THREE.Group();

    // Bed Wood Frame
    const bedBaseGeo = new THREE.BoxGeometry(2.2, 0.35, 2.0);
    const bedWoodMat = createMaterial({ color: 0x5c3a21, roughness: 0.4 });
    const bedBase = new THREE.Mesh(bedBaseGeo, bedWoodMat);
    bedBase.position.set(0, 0.175, 0);
    bedBase.castShadow = true;
    bedBase.receiveShadow = true;
    bedGroup.add(bedBase);

    // Headboard
    const headboardGeo = new THREE.BoxGeometry(2.3, 1.2, 0.15);
    const headboard = new THREE.Mesh(headboardGeo, bedWoodMat);
    headboard.position.set(0, 0.6, -1.0);
    headboard.castShadow = true;
    bedGroup.add(headboard);

    // Crisp Mattress
    const mattressGeo = new THREE.BoxGeometry(2.0, 0.35, 1.85);
    const linenMat = createMaterial({ color: 0xffffff, roughness: 0.9 });
    const mattress = new THREE.Mesh(mattressGeo, linenMat);
    mattress.position.set(0, 0.45, 0.05);
    mattress.castShadow = true;
    bedGroup.add(mattress);

    // Pillows
    const pillowGeo = new THREE.BoxGeometry(0.7, 0.15, 0.45);
    const pillow1 = new THREE.Mesh(pillowGeo, linenMat);
    pillow1.position.set(-0.55, 0.68, -0.65);
    bedGroup.add(pillow1);
    const pillow2 = new THREE.Mesh(pillowGeo, linenMat);
    pillow2.position.set(0.55, 0.68, -0.65);
    bedGroup.add(pillow2);

    // Warm Sunlit Duvet / Blanket Throw
    const duvetGeo = new THREE.BoxGeometry(2.02, 0.18, 1.25);
    const duvetMat = createMaterial({ color: 0xd97706, roughness: 0.8 });
    const duvet = new THREE.Mesh(duvetGeo, duvetMat);
    duvet.position.set(0, 0.55, 0.38);
    duvet.castShadow = true;
    bedGroup.add(duvet);

    bedGroup.position.set(0, 0, -1.5);
    roomGroup.add(bedGroup);

    // G. Bedside Nightstands & Lamps
    const nightstandGeo = new THREE.BoxGeometry(0.5, 0.5, 0.45);
    const nsLeft = new THREE.Mesh(nightstandGeo, bedWoodMat);
    nsLeft.position.set(-1.45, 0.25, -2.2);
    roomGroup.add(nsLeft);

    const nsRight = new THREE.Mesh(nightstandGeo, bedWoodMat);
    nsRight.position.set(1.45, 0.25, -2.2);
    roomGroup.add(nsRight);

    // Warm Bedside Lamp
    const lampStemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
    const lampMat = createMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const lampStem = new THREE.Mesh(lampStemGeo, lampMat);
    lampStem.position.set(-1.45, 0.7, -2.2);
    roomGroup.add(lampStem);

    const lampShadeGeo = new THREE.ConeGeometry(0.18, 0.22, 16, 1, true);
    const shadeMat = createMaterial({ color: 0xffedd5, transparent: true, opacity: 0.9 });
    const lampShade = new THREE.Mesh(lampShadeGeo, shadeMat);
    lampShade.position.set(-1.45, 0.85, -2.2);
    roomGroup.add(lampShade);

    // H. Study / Workstation Table & Chair (For Student / Remote Worker Comfort)
    const deskTopGeo = new THREE.BoxGeometry(1.6, 0.08, 0.7);
    const deskMat = createMaterial({ color: 0x78350f, roughness: 0.4 });
    const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
    deskTop.position.set(-2.0, 0.75, 1.5);
    deskTop.castShadow = true;
    roomGroup.add(deskTop);

    // Desk Legs
    for (const [dx, dz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75);
      const leg = new THREE.Mesh(legGeo, deskMat);
      leg.position.set(-2.0 + dx, 0.375, 1.5 + dz);
      leg.castShadow = true;
      roomGroup.add(leg);
    }

    // Chair
    const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.5);
    const chairMat = createMaterial({ color: 0x1e293b, roughness: 0.6 });
    const chair = new THREE.Mesh(chairSeatGeo, chairMat);
    chair.position.set(-2.0, 0.45, 1.0);
    roomGroup.add(chair);

    // I. Optional Private Sunlit Balcony Railing (If Balcony or City View Room)
    if (hasBalcony) {
      const balconyFloorGeo = new THREE.BoxGeometry(4.0, 0.1, 1.5);
      const balconyMat = createMaterial({ color: 0x94a3b8, roughness: 0.6 });
      const balconyFloor = new THREE.Mesh(balconyFloorGeo, balconyMat);
      balconyFloor.position.set(0, 0.05, 3.2);
      balconyFloor.receiveShadow = true;
      roomGroup.add(balconyFloor);

      // Balcony Glass Railing
      const railingGeo = new THREE.BoxGeometry(3.9, 0.9, 0.05);
      const railingMat = createMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        roughness: 0.1
      });
      const railing = new THREE.Mesh(railingGeo, railingMat);
      railing.position.set(0, 0.55, 3.9);
      roomGroup.add(railing);
    }

    // J. Bathroom Partition Wall
    const bathPartitionGeo = new THREE.BoxGeometry(1.6, 2.8, 0.1);
    const bathMat = createMaterial({ color: 0xe2e8f0, roughness: 0.2 });
    const bathWall = new THREE.Mesh(bathPartitionGeo, bathMat);
    bathWall.position.set(2.3, 1.4, 2.0);
    roomGroup.add(bathWall);

    scene.add(roomGroup);

    // 6. Interactive Mouse & Touch Drag Handler
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      cameraSpherical.current.theta -= deltaX * 0.008;
      cameraSpherical.current.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.05, cameraSpherical.current.phi - deltaY * 0.008)
      );

      previousMousePosition.current = { x: clientX, y: clientY };
      updateCameraFromSpherical();
    };

    const handlePointerUp = () => {
      isDragging.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraSpherical.current.radius = Math.max(
        4.0,
        Math.min(18.0, cameraSpherical.current.radius + e.deltaY * 0.01)
      );
      updateCameraFromSpherical();
    };

    const updateCameraFromSpherical = () => {
      const { radius, theta, phi } = cameraSpherical.current;
      targetCameraPos.current.x = radius * Math.sin(phi) * Math.sin(theta);
      targetCameraPos.current.y = radius * Math.cos(phi);
      targetCameraPos.current.z = radius * Math.sin(phi) * Math.cos(theta);
    };

    container.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    container.addEventListener('touchstart', handlePointerDown, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    container.addEventListener('wheel', handleWheel, { passive: false });

    // 7. Animation Loop with Exponential Damping
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();

      // Smooth camera interpolation
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCameraPos.current, 0.08);
        currentLookAt.current.lerp(targetLookAt.current, 0.08);
        cameraRef.current.lookAt(currentLookAt.current);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Handle Window Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 460;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      container.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      container.removeEventListener('wheel', handleWheel);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose geometries and materials
      floorGeo.dispose();
      backWallGeo.dispose();
      leftWallGeo.dispose();
      rightWallGeo.dispose();
      bedBaseGeo.dispose();
      mattressGeo.dispose();
      pillowGeo.dispose();
      deskTopGeo.dispose();
      materialsRef.current.forEach(m => m.dispose());
      renderer.dispose();
    };
  }, [room, hasBalcony, isCityView]);

  // Lighting preset switch effect
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !keyLightRef.current || !hemiLightRef.current) return;
    if (lightingPreset === 'sunset') {
      sceneRef.current.background = new THREE.Color(0x271924);
      sceneRef.current.fog = new THREE.FogExp2(0x221a28, 0.035);
      keyLightRef.current.color = new THREE.Color(0xf59e0b);
      keyLightRef.current.intensity = 1.8;
      hemiLightRef.current.color = new THREE.Color(0xfb923c);
      hemiLightRef.current.groundColor = new THREE.Color(0x3b0764);
      rendererRef.current.toneMappingExposure = 1.25;
    } else {
      sceneRef.current.background = new THREE.Color(0xf8fafc);
      sceneRef.current.fog = new THREE.FogExp2(0xf1f5f9, 0.035);
      keyLightRef.current.color = new THREE.Color(0xffeedd);
      keyLightRef.current.intensity = 1.4;
      hemiLightRef.current.color = new THREE.Color(0xfff6e8);
      hemiLightRef.current.groundColor = new THREE.Color(0x94a3b8);
      rendererRef.current.toneMappingExposure = 1.1;
    }
  }, [lightingPreset]);

  // Wireframe toggle effect
  useEffect(() => {
    materialsRef.current.forEach(mat => {
      (mat as THREE.MeshStandardMaterial).wireframe = showWireframe;
    });
  }, [showWireframe]);

  // Camera presets
  const handleSetView = (mode: 'perspective' | 'topDown' | 'balcony' | 'bed') => {
    setViewMode(mode);
    setIsFloorPlanMode(mode === 'topDown');

    if (mode === 'topDown') {
      targetCameraPos.current.set(0, 11, 0.01);
      targetLookAt.current.set(0, 0, 0);
      cameraSpherical.current = { radius: 11, theta: 0, phi: 0.01 };
    } else if (mode === 'balcony') {
      targetCameraPos.current.set(0, 1.8, 4.2);
      targetLookAt.current.set(0, 1.2, 0);
      cameraSpherical.current = { radius: 4.5, theta: 0, phi: Math.PI / 2.2 };
    } else if (mode === 'bed') {
      targetCameraPos.current.set(2.5, 2.2, -0.2);
      targetLookAt.current.set(0, 0.8, -1.5);
      cameraSpherical.current = { radius: 3.5, theta: Math.PI / 3, phi: Math.PI / 3 };
    } else {
      targetCameraPos.current.set(7, 5.5, 8.5);
      targetLookAt.current.set(0, 1, 0);
      cameraSpherical.current = { radius: 11, theta: Math.PI / 4, phi: Math.PI / 3 };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xl flex flex-col lg:flex-row">
      {/* 3D Viewport Carrier (Unobstructed central viewport) */}
      <div className="relative flex-1 h-[480px] lg:h-[560px] bg-stone-900 select-none overflow-hidden">
        {/* WebGL Canvas Mount */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top Badges & Notice */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-100 text-xs font-bold border border-stone-700 shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            >
              ← Back to Rooms
            </button>
          )}
          <div className="inline-flex items-center gap-1.5 bg-stone-900/85 backdrop-blur-xs text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-stone-700 shadow-xs">
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive 3D Room Experience</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-900/90 text-amber-200 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs shadow-xs">
            Illustrative Conceptual 3D Model
          </span>
        </div>

        {/* Top-Right Close Button (if in modal) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 px-3 py-1.5 bg-stone-900/85 hover:bg-stone-900 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-stone-700 backdrop-blur-xs flex items-center gap-1"
          >
            <span>Close</span>
            <span className="text-stone-400">✕</span>
          </button>
        )}

        {/* Bottom Unobstructed Control Dock */}
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-20 transition-all duration-300 w-[92%] max-w-[560px] ${
            isControlsCollapsed ? 'translate-y-20' : 'translate-y-0'
          }`}
        >
          {/* Collapse/Expand Toggle Tab */}
          <div className="flex justify-center mb-1">
            <button
              onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
              className="px-3 py-1 bg-stone-900/90 hover:bg-stone-900 text-stone-300 text-[11px] font-medium rounded-t-lg border-t border-x border-stone-700 shadow-xs flex items-center gap-1 cursor-pointer"
            >
              {isControlsCollapsed ? (
                <>
                  <ChevronUp className="w-3 h-3 text-amber-400" />
                  <span>Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>
          </div>

          {/* Main Control Dock */}
          <div className="bg-stone-900/95 backdrop-blur-md rounded-xl p-3 border border-stone-700/80 shadow-2xl flex items-center justify-between gap-2 text-xs text-stone-200">
            {/* View Presets */}
            <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-lg">
              <button
                onClick={() => handleSetView('perspective')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'perspective' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                3D View
              </button>
              <button
                onClick={() => handleSetView('topDown')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'topDown' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                Floor Plan
              </button>
              <button
                onClick={() => handleSetView('bed')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewMode === 'bed' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                }`}
              >
                Bed Area
              </button>
              {hasBalcony && (
                <button
                  onClick={() => handleSetView('balcony')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                    viewMode === 'balcony' ? 'bg-amber-700 text-white shadow-xs' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  Balcony
                </button>
              )}
            </div>

            {/* Lighting Preset & Wireframe Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLightingPreset(lightingPreset === 'daylight' ? 'sunset' : 'daylight')}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 transition-colors cursor-pointer"
                title={`Toggle lighting: currently ${lightingPreset}`}
              >
                {lightingPreset === 'daylight' ? <Sun className="w-4 h-4" /> : <Sunset className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setShowWireframe(!showWireframe)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showWireframe ? 'bg-amber-700 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                }`}
                title="Toggle wireframe mode"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Touch / Mouse Hint */}
        <div className="absolute bottom-3 right-3 text-[10px] text-stone-400/80 bg-black/40 px-2 py-0.5 rounded pointer-events-none">
          Click & Drag to Orbit · Scroll to Zoom
        </div>
      </div>

      {/* Side Room Information & Live Firestore Price Connection */}
      <div className="w-full lg:w-96 p-6 flex flex-col justify-between space-y-6 bg-white border-t lg:border-t-0 lg:border-l border-stone-200">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 px-2.5 py-1 rounded">
                Room #{room.roomNumber} · {room.floor}
              </span>
              {isCityView && (
                <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>City View</span>
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold text-stone-900 mt-2">{room.name}</h3>
            <p className="text-xs text-stone-500 mt-0.5">{room.category} · {room.bedType}</p>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            {room.description}
          </p>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <span className="block text-[10px] text-stone-400 uppercase">Max Capacity</span>
              <span className="font-semibold text-stone-800">Up to {room.totalCapacity} Guests</span>
            </div>
            <div>
              <span className="block text-[10px] text-stone-400 uppercase">Bedding</span>
              <span className="font-semibold text-stone-800">{room.beds} Bed ({room.bedType})</span>
            </div>
          </div>

          {/* Key Amenities */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Room Privileges
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {room.amenities.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-stone-700">
                  <Check className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="truncate">{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Free Inclusions Notice */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-800" />
              <span>Free Pool & Kids Play Area Included</span>
            </span>
            <p className="text-[11px] text-stone-600">
              No extra resort or swimming pool charges. 3 scheduled play sessions daily.
            </p>
          </div>
        </div>

        {/* Pricing & Booking CTA */}
        <div className="pt-4 border-t border-stone-200 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-amber-950 tabular-nums">
                  ₹{room.specialPrice || room.basePrice}
                </span>
                <span className="text-xs text-stone-500">/ night</span>
              </div>
              {room.specialPrice && room.specialPrice < room.basePrice && (
                <span className="text-xs text-stone-400 line-through tabular-nums">
                  ₹{room.basePrice}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-emerald-700">
              Pay upon check-in
            </span>
          </div>

          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="w-1/3 py-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors cursor-pointer"
              >
                ← Back
              </button>
            )}
            <button
              onClick={() => onBookRoom(room)}
              className={`${onClose ? 'w-2/3' : 'w-full'} py-3 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2`}
            >
              <span>Book Room #{room.roomNumber}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
