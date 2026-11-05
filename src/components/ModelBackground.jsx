import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { OrbitControls } from "three-stdlib";

const MODELS = [
  { url: "/models/modern-lite2.glb", offsetX: 0, offsetY: 0, offsetZ: 0, scaleFactor: 3.6, id: 0 },
  // Campus Sign 缩小放到指定位置，绕 Y 轴旋转 45°，与 Modern 同比例放大
  { url: "/models/campus-lite2.glb", offsetX: 13.5, offsetY: -4.5, offsetZ: 13.5, scaleFactor: 1.8, rotY: -Math.PI / 4, id: 1 },
];

const DEFAULT_TUNING = {
  scale: 1.13,
  offsetX: 0.9,
  offsetY: 1,
  offsetZ: 0,
  distance: 31.5,
  targetY: 0,
  brightness: 0.3,
  alpha: 2.5,
  scan: 1,
  edge: 1.2,
};

const VERTEX_SHADER = `
attribute float aModelId;

varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying float vNoise;
varying float vBlur;
varying float vModelId;

uniform float uTime;
uniform float uProgress;
uniform vec3 uMouse;
uniform float uMouseActive;

// 简易噪声
float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  vec3 pos = position;
  vModelId = aModelId;

  // 入场：粒子从散乱位置汇聚
  vec3 scattered = position + vec3(
    sin(position.y * 3.7 + position.x * 1.3) * 4.0,
    cos(position.x * 4.1) * 3.5,
    sin(position.z * 2.9) * 4.0
  );
  pos = mix(scattered, position, smoothstep(0.0, 1.0, uProgress));

  // 全息呼吸：沿法线微微脉动
  float breath = sin(uTime * 0.6 + position.y * 1.5 + position.x * 0.8) * 0.5 + 0.5;
  pos += normal * breath * 0.02;

  // === 鼠标悬停模糊：仅 Modern Building (id=0) ===
  float mouseDist = distance(pos, uMouse);
  float blurFactor = smoothstep(4.0, 0.0, mouseDist) * uMouseActive;
  if (vModelId < 0.5) {
    // Modern Building：模糊抖动
    vBlur = blurFactor;
    float h1 = hash(position.x * 17.0 + position.y * 3.0 + uTime);
    float h2 = hash(position.y * 11.0 + position.z * 7.0 + uTime);
    float h3 = hash(position.z * 13.0 + position.x * 5.0 + uTime);
    pos.x += (h1 - 0.5) * blurFactor * 0.4;
    pos.y += (h2 - 0.5) * blurFactor * 0.4;
    pos.z += (h3 - 0.5) * blurFactor * 0.4;
  } else {
    // Campus Sign：不模糊，鼠标悬停时微微发光推开
    vBlur = 0.0;
    pos += normal * blurFactor * 0.05;
  }

  // 顶点噪声用于闪烁
  vNoise = hash(position.x * 13.0 + position.y * 7.0 + position.z * 5.0 + uTime * 0.3);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewPos = -mvPos.xyz;
  vWorldPos = pos;
  gl_Position = projectionMatrix * mvPos;
}
`;

const FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vWorldPos;
varying float vNoise;
varying float vBlur;
varying float vModelId;

uniform float uTime;
uniform float uProgress;
uniform vec3 uMouse;
uniform float uMouseActive;
uniform float uBrightness;
uniform float uAlpha;
uniform float uScan;
uniform float uEdge;

// Fresnel
float fresnel(vec3 n, vec3 v, float p) {
  return pow(1.0 - max(0.0, dot(n, v)), p);
}

// 闪烁噪声
float flicker(float t) {
  return 0.75 + 0.25 * sin(t * 20.0) * sin(t * 13.0);
}

void main() {
  // 剔除建筑旁边的独立字母结构（放大3倍后：X:6~12, Y:0~-9, Z:0~12）
  if (vWorldPos.x > 6.0 && vWorldPos.x < 12.0 && vWorldPos.y < 0.0 && vWorldPos.y > -9.0 && vWorldPos.z > 0.0 && vWorldPos.z < 12.0) {
    discard;
  }

  bool isCampus = vModelId > 0.5;

  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPos);

  // Fresnel 边缘发光：Campus Sign 增强边缘
  float edgePower = isCampus ? 0.8 : 2.0;
  float edge = fresnel(normal, viewDir, edgePower);
  if (isCampus) {
    edge = pow(edge, 0.8);  // 边缘更宽更锐
  }

  // === 全息扫描线 ===
  float scanY = sin(vWorldPos.y * 15.0 - uTime * 1.2) * 0.5 + 0.5;
  scanY = pow(scanY, 8.0);
  float scanFine = abs(sin(vWorldPos.y * 60.0));
  scanFine = 1.0 - smoothstep(0.0, 0.3, scanFine);
  float scanX = abs(sin(vWorldPos.x * 40.0));
  scanX = 1.0 - smoothstep(0.0, 0.2, scanX);

  // === 流动光带 ===
  float sweep = mod(vWorldPos.y * 0.3 + uTime * 0.5, 6.0) / 6.0;
  float sweepBand = smoothstep(0.0, 0.05, sweep) * smoothstep(0.1, 0.05, sweep);

  // === 数据流 ===
  float dataFlicker = vNoise * flicker(uTime + vWorldPos.x * 3.0);

  // === 鼠标发光 ===
  float mouseDist = distance(vWorldPos, uMouse);
  float mouseGlow = smoothstep(3.0, 0.0, mouseDist) * uMouseActive;
  float mFlicker = 0.7 + 0.3 * sin(uTime * 18.0 + vWorldPos.x * 10.0);
  mouseGlow *= mFlicker;

  // === 模糊散射（仅 Modern Building）===
  float blur = vBlur;
  float blurScatter = blur * (vNoise * 0.5 + 0.5);

  // === 冷色调 ===
  float heightT = clamp((vWorldPos.y + 9.0) / 18.0, 0.0, 1.0);
  vec3 colorDeep = vec3(0.05, 0.12, 0.35);
  vec3 colorMid = vec3(0.08, 0.2, 0.5);
  vec3 colorHigh = vec3(0.12, 0.3, 0.65);
  vec3 baseColor = mix(colorDeep, colorMid, heightT);
  baseColor = mix(baseColor, colorHigh, smoothstep(0.6, 1.0, heightT));
  baseColor *= 1.2;

  // === 合成（两个模型一致）===
  vec3 color = baseColor * 0.16;
  color += baseColor * scanY * 1.0 * uScan;
  color += baseColor * scanFine * 0.2 * uScan;
  color += baseColor * scanX * 0.12 * uScan;
  color += colorHigh * sweepBand * 1.3 * uScan;
  color += colorHigh * dataFlicker * 0.25 * uScan;
  color += vec3(0.15, 0.25, 0.45) * edge * 1.8 * uEdge;
  color += vec3(0.2, 0.35, 0.6) * mouseGlow * 1.2;
  color += vec3(0.3, 0.5, 0.8) * blurScatter * 0.6;

  float globalFlicker = 1.0 + 0.1 * sin(uTime * 3.0);
  float entryFade = pow(uProgress, 1.8);
  color *= globalFlicker * 1.25 * uBrightness * entryFade;

  // === 透明度（两个模型一致）===
  float alpha = 0.12 + edge * 0.65 + scanY * 0.18 + scanFine * 0.05 + sweepBand * 0.25 + dataFlicker * 0.12 + mouseGlow * 0.35;
  // Modern Building：模糊区降低
  if (!isCampus) {
    alpha *= (1.0 - blur * 0.3);
    alpha += blurScatter * 0.3;
  }
  alpha *= uProgress * globalFlicker * uAlpha * entryFade;

  gl_FragColor = vec4(color, alpha);
}
`;

const geometryCache = new Map();

function buildGeometryFromGltf(gltf, file) {
  const mesh = gltf.scene.children[0] || gltf.scene;
  const geometry = mesh.geometry.clone();

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  // 归一化
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const center = new THREE.Vector3();
  box.getCenter(center);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 8 / maxDim;
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(scale, scale, scale);
  if (file.scaleFactor && file.scaleFactor !== 1) {
    geometry.scale(file.scaleFactor, file.scaleFactor, file.scaleFactor);
  }
  if (file.rotY) {
    geometry.rotateY(file.rotY);
  }
  geometry.translate(file.offsetX || 0, file.offsetY || 0, file.offsetZ || 0);

  // 添加模型 ID 属性
  const modelId = new Float32Array(geometry.attributes.position.count).fill(file.id || 0);
  geometry.setAttribute("aModelId", new THREE.BufferAttribute(modelId, 1));
  return geometry;
}

async function loadModel(file) {
  if (geometryCache.has(file.url)) {
    return geometryCache.get(file.url);
  }

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load(file.url, resolve, undefined, reject);
  });

  const geometry = buildGeometryFromGltf(gltf, file);
  geometryCache.set(file.url, geometry);
  return geometry;
}

export default function ParticleField3D() {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(0);
  const tuningRef = useRef(DEFAULT_TUNING);

  useEffect(() => {
    const container = containerRef.current;
    let disposed = false;
    let frameId = 0;
    let loadTimer = 0;
    const meshes = [];
    let controls = null;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 200);
    camera.position.set(24, -4, 24);
    const cameraDirection = new THREE.Vector3(20, -4, 20).normalize();
    const cameraTargetBase = new THREE.Vector3(4, 0, 4);

    const controls2 = new OrbitControls(camera, renderer.domElement);
    controls2.enableDamping = true;
    controls2.dampingFactor = 0.06;
    controls2.autoRotate = false;
    controls2.target.set(4, 0, 4);
    controls2.minDistance = 12;
    controls2.maxDistance = 45;
    controls = controls2;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uMouse: { value: new THREE.Vector3(999, 999, 0) },
        uMouseActive: { value: 0 },
        uBrightness: { value: DEFAULT_TUNING.brightness },
        uAlpha: { value: DEFAULT_TUNING.alpha },
        uScan: { value: DEFAULT_TUNING.scan },
        uEdge: { value: DEFAULT_TUNING.edge },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const modelQueue = [...MODELS];
    let loaded = 0;
    const loadNextModel = async () => {
      const file = modelQueue.shift()
      if (!file) {
        setLoading(100)
        return
      }
      const geometry = await loadModel(file)
      if (disposed) return
      const mesh = new THREE.Mesh(geometry, material)
      mesh.frustumCulled = false
      scene.add(mesh)
      meshes.push(mesh)
      loaded++
      setLoading(Math.round((loaded / MODELS.length) * 100))
      window.setTimeout(() => {
        if (!disposed) loadNextModel()
      }, 60)
    }
    loadTimer = window.setTimeout(() => {
      requestAnimationFrame(() => {
        if (!disposed) loadNextModel()
      })
    }, 180)

    // 鼠标推开
    const mouseNDC = new THREE.Vector2(0, 0);
    const mouseWorld = new THREE.Vector3(999, 999, 0);
    const target = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 32),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    scene.add(sphere);

    const onPointerMove = (event) => {
      mouseNDC.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );
      material.uniforms.uMouseActive.value = 1;
    };
    window.addEventListener("pointermove", onPointerMove);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const startTime = performance.now();

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      const elapsed = (performance.now() - startTime) / 1000;
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uProgress.value = Math.min(1, elapsed / 2.5);

      const params = tuningRef.current;
      material.uniforms.uBrightness.value = params.brightness;
      material.uniforms.uAlpha.value = params.alpha;
      material.uniforms.uScan.value = params.scan;
      material.uniforms.uEdge.value = params.edge;
      const lookTarget = cameraTargetBase.clone();
      lookTarget.y += params.targetY;
      controls2.target.copy(lookTarget);
      camera.position.copy(lookTarget).addScaledVector(cameraDirection, params.distance);
      meshes.forEach((mesh) => {
        mesh.scale.setScalar(params.scale);
        mesh.position.set(params.offsetX, params.offsetY, params.offsetZ);
      });

      if (material.uniforms.uMouseActive.value > 0) {
        raycaster.setFromCamera(mouseNDC, camera);
        const hits = raycaster.intersectObject(sphere);
        if (hits.length > 0) {
          target.copy(hits[0].point);
          mouseWorld.lerp(target, 0.15);
          material.uniforms.uMouse.value.copy(mouseWorld);
        }
        material.uniforms.uMouseActive.value *= 0.95;
        if (material.uniforms.uMouseActive.value < 0.01) {
          material.uniforms.uMouseActive.value = 0;
        }
      }

      controls2.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(loadTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      meshes.forEach((m) => scene.remove(m));
      if (controls) controls.dispose();
      material.dispose();
      sphere.geometry.dispose();
      sphere.material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />
    </>
  );
}
