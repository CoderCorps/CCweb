'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Sparkles, Compass, Eye, ShieldCheck, Lock, RotateCcw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SkillNodeData {
  id: string;
  title: string;
  category: "Frontend" | "Backend" | "DevOps" | "AI & Systems";
  description: string;
  requiredSP: number;
  position: [number, number, number];
  connections: string[];
  unlocked?: boolean;
}

const CONSTELLATION_SKILLS: SkillNodeData[] = [
  {
    id: "foundations",
    title: "Web Foundations",
    category: "Frontend",
    description: "Semantic HTML5, CSS layout grids, DOM tree architecture, and modern ES6+ JavaScript.",
    requiredSP: 50,
    position: [-22, 4, 10],
    connections: ["react", "tailwind"],
  },
  {
    id: "tailwind",
    title: "Tailwind CSS 4",
    category: "Frontend",
    description: "Modern utility styling, CSS variable tokens, responsive dark-mode palettes, and fluid animations.",
    requiredSP: 80,
    position: [-16, -8, 14],
    connections: ["react"],
  },
  {
    id: "react",
    title: "React 19 Mastery",
    category: "Frontend",
    description: "Hooks, server components, concurrent rendering, custom hooks, and state management architectures.",
    requiredSP: 150,
    position: [-10, 14, 16],
    connections: ["nextjs"],
  },
  {
    id: "nextjs",
    title: "Next.js Architect",
    category: "Frontend",
    description: "App Router nested layouts, server actions, streaming SSR, edge middleware, and Turbopack.",
    requiredSP: 250,
    position: [-2, 18, -4],
    connections: ["fastapi", "fullstack"],
  },
  {
    id: "python",
    title: "Python 3.11 Core",
    category: "Backend",
    description: "Type annotations, asyncio concurrency, generator pipelines, and memory optimization.",
    requiredSP: 100,
    position: [10, 14, 14],
    connections: ["fastapi"],
  },
  {
    id: "fastapi",
    title: "FastAPI Engine",
    category: "Backend",
    description: "Asynchronous REST APIs, Pydantic v2 schemas, JWT stateless security, and WebSocket pipelines.",
    requiredSP: 200,
    position: [16, 6, 6],
    connections: ["postgres", "docker"],
  },
  {
    id: "postgres",
    title: "PostgreSQL & ORM",
    category: "Backend",
    description: "SQLAlchemy 2.0 declarative modeling, Alembic schema migrations, and indexing strategies.",
    requiredSP: 220,
    position: [18, -8, 12],
    connections: ["redis"],
  },
  {
    id: "redis",
    title: "Redis & WebSockets",
    category: "Backend",
    description: "Sub-millisecond in-memory caching, pub/sub channels, and live room broadcast states.",
    requiredSP: 280,
    position: [20, -16, -6],
    connections: ["docker"],
  },
  {
    id: "docker",
    title: "Docker & Swarm",
    category: "DevOps",
    description: "Multi-stage Dockerfiles, network isolation, compose orchestrations, and lightweight containerization.",
    requiredSP: 240,
    position: [4, -16, -14],
    connections: ["cicd", "k8s"],
  },
  {
    id: "cicd",
    title: "GitHub Actions CI/CD",
    category: "DevOps",
    description: "Automated test suites, coverage regression guards, container linting, and automated releases.",
    requiredSP: 180,
    position: [-8, -14, -18],
    connections: ["k8s"],
  },
  {
    id: "k8s",
    title: "Cloud Deployment",
    category: "DevOps",
    description: "Cloud ingress routing, reverse proxy setups, TLS certificate automation, and zero-downtime deploys.",
    requiredSP: 350,
    position: [0, -22, 0],
    connections: ["rag_ai"],
  },
  {
    id: "rag_ai",
    title: "AI & RAG Labs",
    category: "AI & Systems",
    description: "Vector embeddings, LLM agent orchestrations, semantic search, and streaming AI responses.",
    requiredSP: 400,
    position: [12, -4, -18],
    connections: ["fullstack"],
  },
  {
    id: "fullstack",
    title: "Full-Stack Capstone",
    category: "AI & Systems",
    description: "End-to-end production architecture: Next.js + FastAPI + PostgreSQL + Docker verified by mentors.",
    requiredSP: 500,
    position: [0, 22, 10],
    connections: [],
  },
];

interface SkillGalaxy3DProps {
  unlockedSkills?: string[];
  skillPoints?: number;
}

export function SkillGalaxy3D({
  unlockedSkills = ["foundations", "react", "python", "fastapi"],
  skillPoints = 350,
}: SkillGalaxy3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [hoveredNode, setHoveredNode] = useState<SkillNodeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNodeData | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  // Compute unlock state per node
  const nodes = useMemo(() => {
    return CONSTELLATION_SKILLS.map((item) => ({
      ...item,
      unlocked: unlockedSkills.includes(item.id) || skillPoints >= item.requiredSP,
    }));
  }, [unlockedSkills, skillPoints]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const width = container.clientWidth;
    const height = container.clientHeight || 550;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050714, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 5, 65);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Cosmic Ambient Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const centerPointLight = new THREE.PointLight(0x6366f1, 3, 100);
    centerPointLight.position.set(0, 0, 0);
    scene.add(centerPointLight);

    // 3. Central Pulsing Supernova Star
    const coreGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Core halo glow
    const haloGeo = new THREE.RingGeometry(2.6, 3.4, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    scene.add(haloMesh);

    // 4. Background Cosmic Starfield (800 Stars)
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 200;
      starPositions[i + 1] = (Math.random() - 0.5) * 200;
      starPositions[i + 2] = (Math.random() - 0.5) * 200;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.7,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Star Nodes Construction
    const nodeMeshes: Array<{ mesh: THREE.Mesh; data: typeof nodes[0] }> = [];
    const sphereGeo = new THREE.SphereGeometry(1.4, 24, 24);

    const categoryColors = {
      Frontend: 0x38bdf8, // Cyan
      Backend: 0x818cf8, // Indigo
      DevOps: 0x34d399, // Emerald
      "AI & Systems": 0xf472b6, // Pink
    };

    nodes.forEach((node) => {
      const isUnlocked = node.unlocked;
      const colorHex = isUnlocked ? categoryColors[node.category] : 0x475569;

      const nodeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: isUnlocked ? colorHex : 0x0f172a,
        emissiveIntensity: isUnlocked ? 0.9 : 0.1,
        roughness: 0.3,
        metalness: 0.8,
      });

      const mesh = new THREE.Mesh(sphereGeo, nodeMat);
      mesh.position.set(...node.position);
      mesh.userData = { skillId: node.id };
      scene.add(mesh);

      // Orbital outer ring for unlocked nodes
      if (isUnlocked) {
        const ringGeo = new THREE.RingGeometry(1.8, 2.1, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.lookAt(camera.position);
        mesh.add(ring);
      }

      nodeMeshes.push({ mesh, data: node });
    });

    // 6. Constellation Laser Lines
    const lineCoords: number[] = [];
    const lineColors: number[] = [];

    nodes.forEach((source) => {
      source.connections.forEach((targetId) => {
        const target = nodes.find((n) => n.id === targetId);
        if (target) {
          lineCoords.push(...source.position);
          lineCoords.push(...target.position);

          const isConnectedGlow = source.unlocked && target.unlocked;
          const c = new THREE.Color(isConnectedGlow ? 0x6366f1 : 0x334155);
          lineColors.push(c.r, c.g, c.b);
          lineColors.push(c.r, c.g, c.b);
        }
      });
    });

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineCoords, 3));
    linesGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      linewidth: 1.5,
    });
    const constellationLines = new THREE.LineSegments(linesGeo, linesMat);
    scene.add(constellationLines);

    // 7. Interactive Raycasting & Mouse Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const rotationMomentum = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        rotationMomentum.y = deltaX * 0.005;
        rotationMomentum.x = deltaY * 0.005;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }

      // Check hover
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((m) => m.mesh));
      if (intersects.length > 0) {
        const hit = nodeMeshes.find((nm) => nm.mesh === intersects[0].object);
        if (hit) {
          setHoveredNode(hit.data);
          container.style.cursor = "pointer";
          return;
        }
      }
      setHoveredNode(null);
      container.style.cursor = "default";
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes.map((m) => m.mesh));
      if (intersects.length > 0) {
        const hit = nodeMeshes.find((nm) => nm.mesh === intersects[0].object);
        if (hit) {
          setSelectedNode(hit.data);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.min(90, Math.max(30, camera.position.z + e.deltaY * 0.05));
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("click", onClick);
    dom.addEventListener("wheel", onWheel, { passive: false });

    // Touch support for mobile devices
    let touchStart = { x: 0, y: 0 };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - touchStart.x;
        const deltaY = e.touches[0].clientY - touchStart.y;
        rotationMomentum.y = deltaX * 0.006;
        rotationMomentum.x = deltaY * 0.006;
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    dom.addEventListener("touchstart", onTouchStart);
    dom.addEventListener("touchmove", onTouchMove);

    // 8. Animation & Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Gentle auto-rotation when not dragging
      if (autoRotate && !isDragging) {
        scene.rotation.y += 0.0025;
      }

      // Apply drag momentum with smooth friction decay
      scene.rotation.y += rotationMomentum.y;
      scene.rotation.x += rotationMomentum.x;
      rotationMomentum.x *= 0.92;
      rotationMomentum.y *= 0.92;

      // Pulse core mesh
      const time = clock.getElapsedTime();
      const pulse = 1 + Math.sin(time * 2) * 0.08;
      coreMesh.scale.set(pulse, pulse, pulse);
      coreMesh.rotation.y += 0.01;
      haloMesh.rotation.z -= 0.005;

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 550;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 10. Memory Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("click", onClick);
      dom.removeEventListener("wheel", onWheel);
      dom.removeEventListener("touchstart", onTouchStart);
      dom.removeEventListener("touchmove", onTouchMove);

      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      sphereGeo.dispose();
      linesGeo.dispose();
      linesMat.dispose();

      if (dom.parentNode) {
        dom.parentNode.removeChild(dom);
      }
    };
  }, [nodes, autoRotate]);

  const categories = ["All", "Frontend", "Backend", "DevOps", "AI & Systems"];

  const filteredNodes = useMemo(() => {
    if (activeCategory === "All") return nodes;
    return nodes.filter((n) => n.category === activeCategory);
  }, [nodes, activeCategory]);

  const unlockedCount = nodes.filter((n) => n.unlocked).length;
  const totalCount = nodes.length;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-border/50 bg-[#050714] shadow-2xl">
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={mountRef}
        className="w-full h-[540px] sm:h-[620px] select-none relative"
      />

      {/* Top Floating HUD: Controls & Metric Pill */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-indigo-500/20 border border-indigo-500/40 backdrop-blur-md text-indigo-300 px-3.5 py-1.5 rounded-full font-mono text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/10">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
            <span className="font-bold">{skillPoints} Skill Points</span>
          </div>

          <div className="bg-card/80 border border-border/60 backdrop-blur-md text-foreground px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold">
            {unlockedCount} / {totalCount} Stars Illuminated
          </div>
        </div>

        {/* Orbit Control Toggles */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`text-xs font-mono h-8 rounded-xl border-border/60 backdrop-blur-md transition-all ${
              autoRotate ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40" : "bg-card/60 text-muted-foreground"
            }`}
          >
            <Compass className="h-3.5 w-3.5 mr-1" />
            {autoRotate ? "Orbiting" : "Static"}
          </Button>
        </div>
      </div>

      {/* Category Filter Pills (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-1.5 max-w-[80%] sm:max-w-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-xl text-xs font-mono transition-all duration-200 backdrop-blur-md ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 scale-105"
                : "bg-card/70 border border-border/40 text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Interactive Navigation Hint (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-20 hidden sm:flex items-center gap-2 text-[10px] font-mono text-muted-foreground bg-card/60 border border-border/40 px-3 py-1 rounded-full backdrop-blur-md pointer-events-none">
        <span>🖱️ Drag to Rotate</span>
        <span>•</span>
        <span>Scroll to Zoom</span>
        <span>•</span>
        <span>Click Star to Inspect</span>
      </div>

      {/* Hovered Star Node Card / Detail HUD */}
      {(hoveredNode || selectedNode) && (
        <div className="absolute top-16 right-4 sm:right-6 z-30 w-72 sm:w-80 glass-premium p-4 rounded-2xl border border-indigo-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {(() => {
            const current = hoveredNode || selectedNode;
            if (!current) return null;
            return (
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                      {current.category}
                    </span>
                    <h3 className="text-base font-extrabold text-foreground mt-1">
                      {current.title}
                    </h3>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shrink-0 ${
                    current.unlocked
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}>
                    {current.unlocked ? (
                      <>
                        <ShieldCheck className="h-3 w-3" /> UNLOCKED
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" /> LOCKED
                      </>
                    )}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {current.description}
                </p>

                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Required XP:</span>
                  <span className={`font-bold ${current.unlocked ? "text-emerald-400" : "text-amber-400"}`}>
                    {current.requiredSP} XP
                  </span>
                </div>

                {selectedNode && (
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="w-full text-center text-[10px] font-mono text-muted-foreground hover:text-foreground pt-1"
                  >
                    Close Details
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
