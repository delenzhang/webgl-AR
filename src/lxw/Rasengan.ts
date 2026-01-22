import * as THREE from 'three';
import { 
  rasenganCoreVert, rasenganCoreFrag, 
  rasenganSwirlVert, rasenganSwirlFrag,
  rasenganRibbonVert, rasenganRibbonFrag,
  rasenganOuterShellVert, rasenganOuterShellFrag,
  airBeltVert, airBeltFrag
} from './rasenganShaders';

export class Rasengan {
  public group: THREE.Group;
  private core: THREE.Mesh;
  private shells: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private targetScale: number = 1.0;
  private outerShell: THREE.Mesh; // 外层保护壳
  private coreRotationSpeed: number = 1.0; // 核心球体旋转速度
  private airBelts: THREE.Mesh[] = []; // 风带数组
  private airBeltMaterials: THREE.ShaderMaterial[] = []; // 风带材质
  private scaleSpeed: number = 0.15; // 缩放速度（可动态调整）

  constructor(coreRotationSpeed: number = 1.0) {
    this.coreRotationSpeed = coreRotationSpeed;
    this.group = new THREE.Group();

    // 1. 核心球体
    const coreGeom = new THREE.SphereGeometry(0.5, 64, 64);
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: rasenganCoreVert,
      fragmentShader: rasenganCoreFrag,
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending, // 改回 AdditiveBlending 确保整个球发亮
      depthWrite: false
    });
    this.core = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.core);
    this.materials.push(coreMat);

    // 2. 外部风力层 (重新开启旋转，速度适中以展现风的流动感)
    const shellConfigs = [
      { size: 0.51, speed: 4.0, color: new THREE.Color(0xffffff) },
      { size: 0.53, speed: -5.0, color: new THREE.Color(0xffffff) },
      { size: 0.56, speed: 7.0, color: new THREE.Color(0xffffff) }
    ];

    shellConfigs.forEach(config => {
      const geom = new THREE.SphereGeometry(config.size, 64, 64);
      const mat = new THREE.ShaderMaterial({
        vertexShader: rasenganSwirlVert,
        fragmentShader: rasenganSwirlFrag,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: config.color },
          uSpeed: { value: config.speed }
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const shell = new THREE.Mesh(geom, mat);
      this.group.add(shell);
      this.shells.push(shell);
      this.materials.push(mat);
    });

    // 3. 丝带层 (Ribbons)
    const ribbonConfigs = [
      { size: 0.54, speed: 12.0 },
      { size: 0.57, speed: -15.0 }
    ];

    ribbonConfigs.forEach(config => {
      const geom = new THREE.SphereGeometry(config.size, 64, 64);
      const mat = new THREE.ShaderMaterial({
        vertexShader: rasenganRibbonVert,
        fragmentShader: rasenganRibbonFrag,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: config.speed }
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ribbonMesh = new THREE.Mesh(geom, mat);
      this.group.add(ribbonMesh);
      this.shells.push(ribbonMesh); // 加入 shells 数组一起更新旋转
      this.materials.push(mat);
    });

    // 4. 外层半透明青蓝色保护壳 (和内部球同样大小)
    const outerShellGeom = new THREE.SphereGeometry(0.58, 64, 64); // 与丝带层大小相近
    const outerShellMat = new THREE.ShaderMaterial({
      vertexShader: rasenganOuterShellVert,
      fragmentShader: rasenganOuterShellFrag,
      uniforms: {
        uTime: { value: 0 }
      },
      transparent: true,
      side: THREE.DoubleSide, // 双面渲染增加厚度感
      blending: THREE.AdditiveBlending, // 改用 Additive 增强发光效果
      depthWrite: false
    });
    this.outerShell = new THREE.Mesh(outerShellGeom, outerShellMat);
    this.group.add(this.outerShell);
    this.materials.push(outerShellMat);

    // 5. 添加4个风带（空气被搅动效果）
    this.createAirBelts();

    this.group.visible = false;
  }

  private createAirBelts() {
    const beltCount = 6; // 增加到6个风带
    const beltRadius = 0.08; // 风带半径（粗细）
    const orbitRadius = 0.5; // 初始轨道半径（会在着色器中动态扩展）
    
    for (let i = 0; i < beltCount; i++) {
      const angle = (i / beltCount) * Math.PI * 2;
      const rotationOffset = i * Math.PI / 3;
      
      // 创建弧形风带 - 使用 TorusGeometry 创建环形带状
      const geometry = new THREE.TorusGeometry(orbitRadius, beltRadius, 16, 100, Math.PI * 1.8);
      
      const material = new THREE.ShaderMaterial({
        vertexShader: airBeltVert,
        fragmentShader: airBeltFrag,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: 1.2 + i * 0.2 }, // 每个风带速度略有不同
          uRotationOffset: { value: rotationOffset },
          uBeltIndex: { value: i } // 传入风带索引用于时间偏移
        },
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const belt = new THREE.Mesh(geometry, material);
      
      // 定位和旋转风带，使其形成螺旋环绕效果
      belt.rotation.z = angle;
      belt.rotation.x = Math.PI * 0.25 * (i % 3); // 不同倾斜角度
      belt.rotation.y = rotationOffset;
      
      this.group.add(belt);
      this.airBelts.push(belt);
      this.airBeltMaterials.push(material);
    }
  }

  public update(time: number) {
    // 始终更新材质时间，即使尺寸为0（这样风带动画不会停止）
    this.materials.forEach(mat => {
      mat.uniforms.uTime.value = time;
    });

    // 更新风带材质的时间
    this.airBeltMaterials.forEach(mat => {
      mat.uniforms.uTime.value = time;
    });

    // 平滑缩放（包括缩小到0）
    const currentScale = this.group.scale.x;
    if (Math.abs(currentScale - this.targetScale) > 0.001) {
      const s = currentScale + (this.targetScale - currentScale) * this.scaleSpeed;
      this.group.scale.set(s, s, s);
    }

    // 只有当尺寸大于一定阈值时才旋转（避免缩小到0时的计算）
    if (currentScale > 0.01) {
      // 开启旋转：展现内部风的螺旋感
      this.shells.forEach((shell, i) => {
        const speed = this.materials[i + 1].uniforms.uSpeed.value;
        shell.rotation.y += 0.02 * speed; 
        shell.rotation.z += 0.01 * speed;
      });
      
      // 核心球体旋转，支持外部传入的速度
      this.core.rotation.y += 0.02 * this.coreRotationSpeed;
      this.core.rotation.x += 0.01 * this.coreRotationSpeed;

      // 风带不需要额外的旋转，扩散和旋转都在着色器中完成
      // 只需要轻微的基础旋转来增加变化
      this.airBelts.forEach((belt, i) => {
        belt.rotation.y += 0.005 * (1 + i * 0.1);
      });
    }
  }

  public setVisible(visible: boolean) {
    this.group.visible = visible;
  }

  public setTargetScale(scale: number) {
    this.targetScale = scale;
  }

  public setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
  }

  public setCoreRotationSpeed(speed: number) {
    this.coreRotationSpeed = speed;
  }

  public setScaleSpeed(speed: number) {
    this.scaleSpeed = speed;
  }
}
