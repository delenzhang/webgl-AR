export const rasenganCoreVert = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const rasenganCoreFrag = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
  
  // 中心亮斑：通过高幂次使其更小、更集中
  float spot = pow(viewDot, 40.0) * 3.0; // 调大幂次使亮斑变小，调大系数使亮度更亮
  
  // 核心光晕：略带一点极浅的蓝色
  float coreGlow = pow(viewDot, 2.0) * 0.8;
  
  vec3 white = vec3(1.0, 1.0, 1.0);
  vec3 cyan = vec3(0.6, 0.9, 1.0);
  
  vec3 finalColor = mix(cyan, white, spot);
  float alpha = spot + coreGlow;
  
  gl_FragColor = vec4(finalColor * 1.5, alpha); // 乘以 1.5 增加过曝感
}
`;

export const rasenganSwirlVert = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const rasenganSwirlFrag = `
uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
varying vec2 vUv;
varying vec3 vNormal;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = noise(i);
  float b = noise(i + vec2(1.0, 0.0));
  float c = noise(i + vec2(0.0, 1.0));
  float d = noise(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec2 uv = vUv;
  
  // 极速旋转的气流
  float wind = 0.0;
  vec2 uv1 = vUv;
  float angle1 = uTime * uSpeed * 0.8;
  mat2 rot1 = mat2(cos(angle1), -sin(angle1), sin(angle1), cos(angle1));
  wind += smoothNoise(rot1 * (uv1 - 0.5) * 8.0 + uTime * 2.0) * 0.6;
  
  vec2 uv2 = vUv;
  float angle2 = uTime * uSpeed * 2.5;
  mat2 rot2 = mat2(cos(angle2), -sin(angle2), sin(angle2), cos(angle2));
  wind += sin(rot2 * (uv2 - 0.5).x * 60.0 + uTime * 15.0) * 0.4;

  // 外部使用透明青蓝色渐变
  float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
  // 边缘淡出效果
  float distFade = pow(viewDot, 1.5);

  // 青蓝色渐变
  vec3 color = vec3(0.2, 0.6, 1.0); // 核心青蓝色
  color = mix(color, vec3(0.0, 0.3, 0.8), 1.0 - viewDot); // 向边缘变为深蓝色
  
  float alpha = (0.1 + wind * 0.9) * distFade;
  
  gl_FragColor = vec4(color * 1.2, alpha * 0.8);
}
`;

export const rasenganRibbonVert = `
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec3 pos = position;
  pos += vNormal * sin(pos.y * 10.0 + uTime * 15.0) * 0.03;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const rasenganRibbonFrag = `
uniform float uTime;
uniform float uSpeed;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vec2 uv = vUv;
  float angle = uTime * uSpeed * 4.0;
  float s = sin(angle);
  float c = cos(angle);
  mat2 rot = mat2(c, -s, s, c);
  uv = rot * (uv - 0.5) + 0.5;

  float ribbon = sin(uv.x * 480.0 + uTime * 30.0); // 频率翻倍：240 -> 480
  ribbon = smoothstep(0.998, 0.9999, ribbon); // 收窄阈值使其更细
  
  float ribbon2 = sin(uv.y * 400.0 - uTime * 25.0); // 频率翻倍：200 -> 400
  ribbon2 = smoothstep(0.998, 0.9999, ribbon2);
  
  float finalRibbon = max(ribbon, ribbon2);

  float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
  float distFade = pow(viewDot, 4.0);

  // 丝带也带上点青色发光
  vec3 color = vec3(0.8, 0.95, 1.0);
  float alpha = finalRibbon * distFade * 8.0; // 增加亮度补偿
  
  gl_FragColor = vec4(color, alpha);
}
`;

export const rasenganOuterShellVert = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const rasenganOuterShellFrag = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  // 外壳使用 Fresnel 效果：边缘更亮，中心透明
  float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
  float fresnel = pow(1.0 - viewDot, 2.0); // 边缘发光
  
  // 同时增加整体的基础亮度，使整个球都发光
  float baseLuminosity = 0.3; // 基础发光度
  
  // 青蓝色半透明
  vec3 color = vec3(0.2, 0.6, 1.0);
  
  // 轻微的脉动效果
  float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
  
  // 混合基础发光和边缘发光
  float alpha = (baseLuminosity + fresnel * 0.5) * pulse;
  
  gl_FragColor = vec4(color * 1.5, alpha); // 增加颜色亮度使其发光
}
`;

// 风带顶点着色器 - 支持从中心向外扩散
export const airBeltVert = `
uniform float uTime;
uniform float uSpeed;
uniform float uRotationOffset;
uniform float uBeltIndex; // 风带索引
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vLifeProgress; // 生命周期进度

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  // 生命周期：2.5秒一个循环
  float cycleTime = mod(uTime * 0.6 + uBeltIndex * 0.6, 2.5);
  vLifeProgress = cycleTime / 2.5;
  
  // 从中心向外扩散：scale从0增长到2
  float expandScale = vLifeProgress * 2.0;
  
  vec3 pos = position;
  
  // 应用扩散缩放
  pos *= (0.2 + expandScale);
  
  // 添加螺旋旋转
  float spiralAngle = vLifeProgress * 3.14159 * 4.0 + uRotationOffset;
  float cosA = cos(spiralAngle);
  float sinA = sin(spiralAngle);
  mat2 rot = mat2(cosA, -sinA, sinA, cosA);
  pos.xy = rot * pos.xy;
  
  // 添加波动效果
  float wave = sin(vLifeProgress * 10.0 + uTime * uSpeed) * 0.05;
  pos += normal * wave;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// 风带片段着色器 - 生成、扩散、消失
export const airBeltFrag = `
uniform float uTime;
uniform float uSpeed;
uniform float uRotationOffset;
uniform float uBeltIndex;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vLifeProgress;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = noise(i);
  float b = noise(i + vec2(1.0, 0.0));
  float c = noise(i + vec2(0.0, 1.0));
  float d = noise(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // === 生命周期淡入淡出 ===
  // 开始时淡入，结束时淡出
  float lifeFade = sin(vLifeProgress * 3.14159);
  lifeFade = smoothstep(0.0, 0.15, vLifeProgress) * smoothstep(1.0, 0.85, vLifeProgress);
  
  // === 沿风带的渐变 ===
  float lengthGradient = sin(vUv.y * 3.14159);
  
  // === 螺旋流动纹理 ===
  float spiralPattern = sin(vUv.y * 25.0 - uTime * uSpeed * 6.0 + uRotationOffset * 10.0);
  spiralPattern = smoothstep(0.2, 0.8, spiralPattern);
  
  // === 湍流效果 ===
  vec2 noiseUv = vUv * 4.0 + vec2(uTime * uSpeed * 0.8, vLifeProgress * 2.0);
  float turbulence = smoothNoise(noiseUv);
  turbulence = pow(turbulence, 1.5);
  
  // === 快速流动的条纹 ===
  float stripes = sin(vUv.y * 60.0 - uTime * uSpeed * 12.0 - vLifeProgress * 20.0);
  stripes = smoothstep(0.8, 0.92, stripes);
  
  // === 扩散时的能量脉冲 ===
  float energyPulse = 1.0 - abs(vLifeProgress - 0.5) * 2.0; // 中期最亮
  energyPulse = pow(energyPulse, 2.0) * 0.5 + 0.5;
  
  // 组合所有效果
  float pattern = spiralPattern * 0.4 + turbulence * 0.4 + stripes * 0.3;
  pattern *= lengthGradient * energyPulse;
  
  // 颜色：青白色渐变，扩散过程中逐渐变蓝
  vec3 color1 = vec3(0.9, 0.98, 1.0); // 生成时：亮白色
  vec3 color2 = vec3(0.4, 0.7, 1.0);  // 消失时：青蓝色
  vec3 color = mix(color1, color2, vLifeProgress);
  
  // 最终透明度
  float alpha = pattern * lifeFade * 0.6;
  
  gl_FragColor = vec4(color * 1.8, alpha);
}
`;
