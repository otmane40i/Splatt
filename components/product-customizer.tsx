"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderModal } from "@/components/order-modal";
import { useLanguage } from "@/components/language-provider";
import { formatMad } from "@/lib/utils";
import type { StoreProduct } from "@/lib/catalog";

const paintColors = ["#FF2E93", "#1FA8A0", "#FF6B1A", "#F1C40F", "#9B59B6", "#3498DB", "#F0F0F0", "#222222"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function addProjectedUvs(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const positions = geometry.attributes.position;
  if (!box || !positions) return;

  const width = Math.max(0.001, box.max.x - box.min.x);
  const height = Math.max(0.001, box.max.z - box.min.z);
  const uvs = new Float32Array(positions.count * 2);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    uvs[index * 2] = THREE.MathUtils.clamp((x - box.min.x) / width, 0, 1);
    uvs[index * 2 + 1] = THREE.MathUtils.clamp((z - box.min.z) / height, 0, 1);
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

function drawPaintSheet(context: CanvasRenderingContext2D, color: string, startX: number, width: number, height: number) {
  const sheetWidth = randomBetween(width * 0.14, width * 0.28);
  const segments = 12;
  const left: Array<{ x: number; y: number }> = [];
  const right: Array<{ x: number; y: number }> = [];
  let drift = randomBetween(-width * 0.04, width * 0.04);

  for (let index = 0; index <= segments; index += 1) {
    const y = (height / segments) * index - height * 0.08;
    drift += randomBetween(-width * 0.025, width * 0.025);
    const wave = Math.sin(index * 0.9 + Math.random()) * width * 0.018;
    left.push({ x: startX + drift + wave, y });
    right.push({ x: startX + sheetWidth + drift - wave + randomBetween(-width * 0.018, width * 0.018), y });
  }

  context.save();
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.beginPath();
  context.moveTo(left[0].x, left[0].y);
  for (let index = 1; index < left.length; index += 1) {
    const previous = left[index - 1];
    const current = left[index];
    context.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  }
  for (let index = right.length - 1; index > 0; index -= 1) {
    const previous = right[index];
    const current = right[index - 1];
    context.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  }
  context.closePath();
  context.fill();
  context.restore();
}

function drawStream(context: CanvasRenderingContext2D, color: string, startX: number, width: number, height: number) {
  const points: Array<{ x: number; y: number }> = [];
  const segments = 9 + Math.floor(Math.random() * 6);
  const streamHeight = randomBetween(height * 0.64, height * 1.16);
  let x = startX;

  for (let index = 0; index <= segments; index += 1) {
    const y = (streamHeight / segments) * index - height * 0.08;
    x += randomBetween(-width * 0.055, width * 0.055);
    points.push({ x, y });
  }

  const streamWidth = randomBetween(width * 0.036, width * 0.115);
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = 7;
  context.strokeStyle = color;
  context.lineWidth = streamWidth;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    context.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
  }
  context.stroke();

  for (let index = 2; index < points.length; index += 3) {
    const point = points[index];
    const dripLength = randomBetween(height * 0.04, height * 0.16);
    context.lineWidth = streamWidth * randomBetween(0.22, 0.48);
    context.beginPath();
    context.moveTo(point.x + randomBetween(-streamWidth, streamWidth), point.y);
    context.lineTo(point.x + randomBetween(-streamWidth, streamWidth), point.y + dripLength);
    context.stroke();
    context.beginPath();
    context.arc(point.x, point.y + dripLength, streamWidth * randomBetween(0.18, 0.34), 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  }
  context.restore();
}

function drawHighlight(context: CanvasRenderingContext2D, startX: number, width: number, height: number) {
  const streamHeight = randomBetween(height * 0.34, height * 0.72);
  let x = startX;
  context.save();
  context.globalAlpha = 0.42;
  context.strokeStyle = "#ffffff";
  context.lineWidth = randomBetween(2, 6);
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x, randomBetween(height * 0.02, height * 0.16));
  for (let y = height * 0.12; y < streamHeight; y += randomBetween(42, 80)) {
    x += randomBetween(-width * 0.02, width * 0.02);
    context.lineTo(x, y);
  }
  context.stroke();
  context.restore();
}

function generatePourTexture(selectedColors: string[]) {
  if (selectedColors.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.92;
  for (let index = 0; index < 9; index += 1) {
    drawPaintSheet(context, selectedColors[Math.floor(Math.random() * selectedColors.length)], randomBetween(canvas.width * -0.12, canvas.width * 0.96), canvas.width, canvas.height);
  }

  context.globalAlpha = 0.45;
  context.filter = "blur(6px)";
  for (let index = 0; index < 18; index += 1) {
    drawStream(context, selectedColors[Math.floor(Math.random() * selectedColors.length)], randomBetween(canvas.width * -0.12, canvas.width * 1.12), canvas.width, canvas.height);
  }

  context.globalAlpha = 1;
  context.filter = "none";
  for (let index = 0; index < 44; index += 1) {
    drawStream(context, selectedColors[Math.floor(Math.random() * selectedColors.length)], randomBetween(canvas.width * -0.1, canvas.width * 1.1), canvas.width, canvas.height);
  }

  for (let index = 0; index < 28; index += 1) {
    drawHighlight(context, randomBetween(canvas.width * 0.06, canvas.width * 0.94), canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function modelExtension(modelPath: string) {
  try {
    const parsed = new URL(modelPath);
    return decodeURIComponent(parsed.pathname).split(".").pop()?.toLowerCase() ?? "";
  } catch {
    return modelPath.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  }
}

type ViewerState = {
  material: THREE.MeshStandardMaterial;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  resetView: () => void;
};

export function ProductCustomizer({ product }: { product: StoreProduct }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ViewerState | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const { locale } = useLanguage();
  const name = locale === "fr" ? product.nameFR : product.nameEN;
  const description = locale === "fr" ? product.descFR : product.descEN;

  const customizationNote = useMemo(() => {
    return selectedColors.length > 0 ? `Selected pour colors: ${selectedColors.join(", ")}` : "";
  }, [selectedColors]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !product.model3d) return;

    setLoadError("");
    let cancelled = false;
    let frame = 0;
    let introFloatStart = 0;
    let introFloatActive = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.up.set(0, 0, 1);
    camera.position.set(0, -6, 0.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.34, metalness: 0.04 });
    scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.1);
    directionalLight.position.set(4, 5, 6);
    scene.add(directionalLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.025;
    controls.autoRotate = false;
    controls.enablePan = true;
    controls.panSpeed = 0.82;
    controls.rotateSpeed = 0.82;
    controls.zoomSpeed = 0.95;
    controls.minDistance = 1.8;
    controls.maxDistance = 12;
    controls.screenSpacePanning = true;

    function resetView() {
      introFloatActive = false;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0;
      camera.up.set(0, 0, 1);
      camera.position.set(0, -6, 0.12);
      controls.target.set(0, 0, 0.12);
      controls.update();
    }

    function fitObject(object: THREE.Object3D) {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      const scale = 3.35 / Math.max(size, 0.001);
      object.scale.setScalar(scale);
      object.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    }

    function resize() {
      if (!mount) return;
      const rect = mount.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    }

    function startIntroFloat() {
      introFloatStart = performance.now();
      introFloatActive = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.18;
    }

    async function loadModel() {
      const path = product.model3d ?? "";
      const extension = modelExtension(path);
      if (extension === "obj") {
        const object = await new OBJLoader().loadAsync(path);
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            addProjectedUvs(child.geometry);
            child.geometry.computeVertexNormals();
          }
        });
        fitObject(object);
        scene.add(object);
      } else {
        const geometry = await new STLLoader().loadAsync(path);
        geometry.computeVertexNormals();
        addProjectedUvs(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        fitObject(mesh);
        scene.add(mesh);
      }
      resetView();
      startIntroFloat();
    }

    controls.addEventListener("start", () => {
      introFloatActive = false;
      controls.autoRotate = false;
    });
    window.addEventListener("resize", resize);
    resize();
    viewerRef.current = { material, controls, camera, resetView };

    loadModel().catch((error: unknown) => {
      console.error(error);
      if (!cancelled) setLoadError("Could not load the 3D model.");
    });

    function animate() {
      frame = requestAnimationFrame(animate);
      if (introFloatActive) {
        const elapsed = performance.now() - introFloatStart;
        if (elapsed < 2200) controls.autoRotateSpeed = 0.18;
        else if (elapsed < 3000) controls.autoRotateSpeed = 0.18 * (1 - (elapsed - 2200) / 800);
        else {
          introFloatActive = false;
          controls.autoRotate = false;
        }
      }
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      controls.dispose();
      material.map?.dispose();
      material.dispose();
      renderer.dispose();
      mount.replaceChildren();
      viewerRef.current = null;
    };
  }, [product.model3d]);

  function toggleColor(color: string) {
    setSelectedColors((current) => {
      if (current.includes(color)) return current.filter((item) => item !== color);
      if (current.length >= 3) return current;
      return [...current, color];
    });
  }

  function pourPaint() {
    const state = viewerRef.current;
    if (!state || selectedColors.length === 0) return;
    const texture = generatePourTexture(selectedColors);
    if (!texture) return;
    state.material.map?.dispose();
    state.material.map = texture;
    state.material.color.set("#ffffff");
    state.material.roughness = 0.24;
    state.material.needsUpdate = true;
  }

  if (!product.model3d) {
    return (
      <main className="container-page grid gap-10 py-12 lg:grid-cols-2">
        <div className="glass relative aspect-square overflow-hidden p-8">
          <Image src={product.image} alt={name} fill className="object-contain p-8" priority />
        </div>
        <section className="flex flex-col justify-center">
          <Badge className="w-fit">{product.category}</Badge>
          <h1 className="mt-5 font-space text-5xl font-black">{name}</h1>
          <p className="mt-4 text-lg text-white/60">{description}</p>
          <p className="mt-8 text-3xl font-black">{formatMad(product.price)}</p>
          <div className="mt-8"><OrderModal product={product} /></div>
        </section>
      </main>
    );
  }

  return (
    <main className="container-page grid gap-8 py-8 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="glass relative min-h-[58vh] overflow-hidden p-0 lg:min-h-[760px]">
        <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        {loadError ? <div className="absolute inset-0 grid place-items-center text-sm font-bold text-red-200">{loadError}</div> : null}
        <Button type="button" variant="outline" className="absolute bottom-5 left-5 z-10" onClick={() => viewerRef.current?.resetView()}>
          <RotateCcw className="h-4 w-4" /> Reset view
        </Button>
      </section>

      <section className="flex flex-col justify-center">
        <Badge className="w-fit">{product.category}</Badge>
        <h1 className="mt-5 font-space text-5xl font-black">{name}</h1>
        <p className="mt-4 text-lg text-white/60">{description}</p>
        <p className="mt-7 text-3xl font-black text-splatt-teal">{formatMad(product.price)}</p>

        <div className="mt-7 flex flex-wrap gap-3" aria-label="Paint colors">
          {paintColors.map((color) => {
            const active = selectedColors.includes(color);
            return (
              <button
                key={color}
                type="button"
                aria-pressed={active}
                aria-label={`Select ${color}`}
                onClick={() => toggleColor(color)}
                className={`h-11 w-11 rounded-full border-2 transition ${active ? "border-white ring-2 ring-white ring-offset-4 ring-offset-black" : "border-white/25 hover:scale-105"}`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button type="button" onClick={pourPaint} disabled={selectedColors.length === 0}>Pour the paint</Button>
          <OrderModal product={product} customizationNote={customizationNote} />
        </div>
      </section>
    </main>
  );
}
