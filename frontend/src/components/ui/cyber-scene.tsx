"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function CyberScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Get container dimensions
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || 500;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 220;
    camera.position.y = 80;
    camera.lookAt(0, 0, 0);

    // 3. Renderer Setup (alphachannel enabled for page background compatibility)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 4. Create Node Network / Particles
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Seed coordinates randomly
    for (let i = 0; i < particleCount; i++) {
      // Create a grid-like horizontal distribution with random noise
      const x = (Math.random() - 0.5) * 350;
      const y = (Math.random() - 0.5) * 100 - 30;
      const z = (Math.random() - 0.5) * 350;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Small hover drifts
      velocities[i * 3] = (Math.random() - 0.5) * 0.15;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Custom shader or standard Canvas Round Particle point material
    // We create a canvas texture for smooth circles instead of square points
    const createCircleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 16, 16);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const material = new THREE.PointsMaterial({
      color: 0x6366f1, // indigo-500
      size: 4.5,
      transparent: true,
      opacity: 0.8,
      map: createCircleTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 5. Grid/Lines Connections
    // Create random connections between points that are close to each other
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x06b6d4, // cyan-500
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * 6); // Mock line pairs
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(connections);

    // Mouse Tracking Coordinates
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      // Normalize mouse coordinates (-1 to 1)
      targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 6. Animation Loop
    const startTime = Date.now();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = (Date.now() - startTime) / 1000;
      const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
      const array = positionAttr.array as Float32Array;

      // Smooth interpolation for mouse position (ease effect)
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Update positions with wave dynamics + mouse attraction
      let lineIdx = 0;
      const connectedPairs: number[] = [];

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Base sine wave movements
        const initialX = initialPositions[i3];
        const initialY = initialPositions[i3 + 1];
        const initialZ = initialPositions[i3 + 2];

        // Waves based on elapsed clock time
        array[i3] = initialX + Math.sin(elapsed + initialZ * 0.01) * 8;
        array[i3 + 1] = initialY + Math.cos(elapsed * 0.8 + initialX * 0.01) * 12;
        array[i3 + 2] = initialZ + Math.sin(elapsed * 0.5 + initialY * 0.01) * 8;

        // Apply mouse distortion if cursor is active
        const distToMouseX = array[i3] - currentMouseX * 180;
        const distToMouseY = array[i3 + 1] - currentMouseY * 100;
        const distance = Math.sqrt(distToMouseX * distToMouseX + distToMouseY * distToMouseY);

        if (distance < 80) {
          // Push particles slightly away or attract
          const force = (80 - distance) * 0.15;
          array[i3] += (distToMouseX / distance) * force;
          array[i3 + 1] += (distToMouseY / distance) * force;
        }
      }

      positionAttr.needsUpdate = true;

      // Re-calculate closest connections
      const lineArray = lineGeometry.attributes.position.array as Float32Array;
      let linePairsCount = 0;

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          if (linePairsCount >= 200) break; // Limit lines for performance

          const dx = array[i * 3] - array[j * 3];
          const dy = array[i * 3 + 1] - array[j * 3 + 1];
          const dz = array[i * 3 + 2] - array[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 60) {
            const pIdx = linePairsCount * 6;
            lineArray[pIdx] = array[i * 3];
            lineArray[pIdx + 1] = array[i * 3 + 1];
            lineArray[pIdx + 2] = array[i * 3 + 2];

            lineArray[pIdx + 3] = array[j * 3];
            lineArray[pIdx + 4] = array[j * 3 + 1];
            lineArray[pIdx + 5] = array[j * 3 + 2];
            linePairsCount++;
          }
        }
      }

      // Hide unused line segments in buffer coordinates
      for (let k = linePairsCount * 6; k < lineArray.length; k++) {
        lineArray[k] = 0;
      }

      lineGeometry.attributes.position.needsUpdate = true;

      // Slow orbital rotate the entire particle group
      particles.rotation.y = elapsed * 0.02;
      connections.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize Event Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 500;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 8. Cleanup Logic
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }

      // Dispose geometry, materials, and WebGL context
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full -z-10 overflow-hidden" />;
}
