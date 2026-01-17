export const mainSwordVert = `
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

export const mainSwordFrag = `
uniform float uTime;
uniform vec3 uColorBase; // Matte Green
uniform vec3 uColorEnergy; // Christmas Red / Gold
uniform float uEmpower; // 0.0 to 1.0

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simple noise function
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  // 基础颜色 (哑光绿)
  vec3 color = uColorBase;
  
  // 能量流动效果
  float flow = sin(vUv.y * 10.0 - uTime * 5.0) * 0.5 + 0.5;
  float noiseVal = noise(vUv + uTime * 0.1);
  
  // 边缘发光 (Fresnel)
  float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
  
  // 能量脉冲
  float pulse = sin(uTime * (3.0 + uEmpower * 7.0)) * 0.5 + 0.5;
  vec3 energyColor = mix(uColorEnergy, vec3(1.0, 0.9, 0.5), pulse); // 红金交替
  
  color = mix(color, energyColor, flow * 0.3 * (1.0 + uEmpower));
  color += energyColor * fresnel * (0.5 + uEmpower);
  
  // 脉冲光带
  float band = step(0.95, sin(vUv.y * 20.0 - uTime * 10.0));
  color += energyColor * band * (0.5 + uEmpower);

  gl_FragColor = vec4(color, 1.0);
}
`;

export const swordArrayVert = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vInstanceColor;
uniform float uTime;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vInstanceColor = instanceColor;
  
  // 简单的实例变换
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
`;

export const swordArrayFrag = `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vInstanceColor;

void main() {
  // 基础颜色
  vec3 color = vInstanceColor;
  
  // 简单的光照
  float diffuse = max(0.2, dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))));
  color *= diffuse;
  
  // 边缘发光
  float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
  color += vec3(0.3, 0.8, 0.5) * fresnel * 0.5;
  
  // 时间脉冲
  float pulse = sin(uTime * 3.0) * 0.1 + 0.9;
  color *= pulse;
  
  gl_FragColor = vec4(color, 0.9);
}
`;
