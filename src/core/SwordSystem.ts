import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mainSwordVert, mainSwordFrag, swordArrayVert, swordArrayFrag } from '../shaders/swordShaders';
import gsap from 'gsap';

export type SwordState = 'FOLD' | 'RELEASE' | 'TRACK';

interface TrailPoint {
  position: THREE.Vector3;
  timestamp: number;
}

interface SwordParticle {
  position: THREE.Vector3;
  startPosition: THREE.Vector3; // 动画开始时的位置
  targetPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationSpeed: number;
  scale: number;
  originalIndex: number;
  trailIndex: number; // 跟随轨迹中的哪个点
  trailFollowSpeed: number; // 每把剑跟随轨迹的独立速度（0.15-0.35）
  trailProgress: number; // 沿轨迹的运动进度（0-1），用于先慢后快
  trackRandomSpeed: number; // TRACK 状态下的随机速度
}

export class SwordSystem {
  private swordParticles!: THREE.InstancedMesh; // 使用 ! 表示会在 constructor 中初始化
  private particles: SwordParticle[] = [];
  private count: number = 200;
  private dummy = new THREE.Object3D();
  
  // 状态参数
  public state: SwordState = 'RELEASE';
  private centerPosition = new THREE.Vector3(0, 0, 0);
  private middleFingerPosition = new THREE.Vector3(0, 0, 0); // 中指位置
  private targetPointD = new THREE.Vector3(0, 0, 0); // 共享的目标点 D
  private animationProgress = 0;
  
  // 粒子系统参数
  public sphereRadius = 1.6; // 聚拢时的球体半径，调小一点更贴合拳头
  private scatterRadius = 18; // 散开时的最大半径
  
  // 旋转控制参数
  private sphereRotationAngle = 0; // 记录球体旋转的累计角度
  public sphereRotationSpeed = 4.0; // 调快旋转速度，增加旋转感
  
  // 轨迹跟随参数
  private isFollowingTrail = false;
  private currentTrail: TrailPoint[] = [];
  private trailFollowDistance = 0.5; // 粒子沿轨迹的间距
  
  // RELEASE 状态轨迹跟随延迟控制
  private releaseTrailDelaySeconds = 3.0; // 从 FOLD 切换到 RELEASE 后的延迟时间（秒）
  private lastReleaseTime: number = 0; // 上次切换到 RELEASE 的时间戳
  private canFollowTrailInRelease = false; // RELEASE 状态下是否可以跟随轨迹

  /**
   * Cubic Ease-In-Out 缓动函数
   * 名称：缓入缓出 (Ease-In-Out)
   * 特点：开始时很慢，中间加速，结束时减速。
   * 这种曲线符合物理世界的加速和减速过程，让剑阵的运动看起来更自然、更有“御剑”的灵性。
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  constructor(scene: THREE.Scene) {
    this.initParticleSystem(scene);
    this.initParticles();
  }

  private initParticleSystem(scene: THREE.Scene) {
    // 1. 创建复合几何体
    const bladeBodyGeom = new THREE.BoxGeometry(0.12, 0.8, 0.03);
    bladeBodyGeom.translate(0, -0.4, 0);
    
    // 剑头：宽度0.12，厚度0.03，底面为长方形以完美匹配剑身截面
    // 使用 4 棱柱旋转 45 度并缩放，使 4 个顶点正好对准长方体的 4 个角
    const tipBaseRadius = 0.06 * Math.sqrt(2); // 使旋转后的顶点位于 0.06 处
    const bladeTipGeom = new THREE.CylinderGeometry(tipBaseRadius, 0.0001, 0.2, 4); 
    bladeTipGeom.rotateY(Math.PI / 4); // 旋转使顶点从轴线对齐变为对角线对齐
    bladeTipGeom.scale(1, 1, 0.25);    // Z轴缩放 0.25 (0.12 -> 0.03)，使其厚度与剑身完全一致
    bladeTipGeom.translate(0, -0.9, 0); // 衔接在剑身底部 (-0.8) 到 (-1.0) 之间
    
    const guardGeom = new THREE.BoxGeometry(0.5, 0.05, 0.08);
    guardGeom.translate(0, 0.025, 0);
    
    const handleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    handleGeom.translate(0, 0.175, 0);

    // 为不同部分设置 vertex color 和 vertex alpha
    const setGeometryAttributes = (geom: THREE.BufferGeometry, color: THREE.Color, alpha: number) => {
      const count = geom.attributes.position.count;
      const colorArray = new Float32Array(count * 3);
      const alphaArray = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
        alphaArray[i] = alpha;
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
      geom.setAttribute('vAlpha', new THREE.BufferAttribute(alphaArray, 1));
    };

    const colorBlade = new THREE.Color(0x00ffcc); 
    const colorGuard = new THREE.Color(0x001133); 
    const colorHandle = new THREE.Color(0x003366); 
    
    // 剑身较透，剑柄剑把较实
    setGeometryAttributes(bladeBodyGeom, colorBlade, 1);
    setGeometryAttributes(bladeTipGeom, colorBlade, 1);
    setGeometryAttributes(handleGeom, colorHandle, 0.8);
    setGeometryAttributes(guardGeom, colorGuard, 0.6);
    
    const swordGeom = BufferGeometryUtils.mergeGeometries([bladeBodyGeom, bladeTipGeom, guardGeom, handleGeom]);
    
    // 2. 材质使用 vertexColors 并注入顶点透明度处理
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0x00ffcc,
      emissiveIntensity: 3.0, // 增加自发光强度，使其在不透明状态下依然有灵气
      transparent: true,
      metalness: 0.9,
      roughness: 0.1,
    });

    // 注入自定义 Shader 逻辑处理顶点透明度
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        attribute float vAlpha;
        varying float vAlphaVar;
        ${shader.vertexShader}
      `.replace(
        '#include <color_vertex>',
        `#include <color_vertex>
         vAlphaVar = vAlpha;`
      );
      shader.fragmentShader = `
        varying float vAlphaVar;
        ${shader.fragmentShader}
      `.replace(
        '#include <alphamap_fragment>',
        `#include <alphamap_fragment>
         diffuseColor.a *= vAlphaVar;`
      );
    };
    
    this.swordParticles = new THREE.InstancedMesh(swordGeom, material, this.count);
    
    // 初始化 Instance 颜色（整体色调微调）
    const instanceColors = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const color = new THREE.Color(0xffffff); // 基础色为白色，乘以顶点色
      instanceColors[i * 3] = color.r;
      instanceColors[i * 3 + 1] = color.g;
      instanceColors[i * 3 + 2] = color.b;
    }
    this.swordParticles.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
    
    scene.add(this.swordParticles);
    console.log('青光剑阵已升级：区分剑身、剑柄、剑把颜色');
  }

  private initParticles() {
    for (let i = 0; i < this.count; i++) {
      const particle: SwordParticle = {
        position: new THREE.Vector3(),
        startPosition: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        rotationSpeed: (Math.random() - 0.5) * 4,
        scale: 0.8 + Math.random() * 0.4,
        originalIndex: i,
        trailIndex: -1, // 初始不跟随轨迹
        trailFollowSpeed: 0.15 + Math.random() * 0.2, // 随机速度 0.15-0.35
        trailProgress: 0, // 初始进度为0
        trackRandomSpeed: 0.02 + Math.random() * 0.08 // TRACK 状态下的随机速度
      };
      
      // 初始随机分布
      this.setRandomPosition(particle);
      particle.position.copy(particle.targetPosition);
      
      this.particles.push(particle);
      
      // 设置初始矩阵
      this.dummy.position.copy(particle.position);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(particle.scale);
      this.dummy.updateMatrix();
      this.swordParticles.setMatrixAt(i, this.dummy.matrix);
    }
    
    this.swordParticles.instanceMatrix.needsUpdate = true;
    console.log('粒子初始化完成，粒子数量:', this.particles.length);
  }

  private setRandomPosition(particle: SwordParticle) {
    const phi = Math.random() * Math.PI * 2;
    const costheta = Math.random() * 2 - 1;
    const theta = Math.acos(costheta);
    const radius = this.scatterRadius * (0.5 + Math.random() * 0.5);
    
    particle.targetPosition.set(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta)
    );
  }

  private setSpherePosition(particle: SwordParticle) {
    const phi = Math.random() * Math.PI * 2;
    const costheta = Math.random() * 2 - 1;
    const theta = Math.acos(costheta);
    const radius = this.sphereRadius * (0.8 + Math.random() * 0.4);
    
    particle.targetPosition.set(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta)
    );
  }

  updateTarget(x: number, y: number, rotation: number) {
    this.centerPosition.set(x, y, 0);
  }

  updateMiddleFinger(x: number, y: number, z: number) {
    this.middleFingerPosition.set(x, y, z);
    
    // 计算目标点 D
    // 向 Z 轴发射射线（寻找 z 最大的剑，即离屏幕最近的剑）
    // 这里的逻辑是：在 (x, y) 位置，寻找现有的剑中 z 值最符合“第一个遇到”的那个
    // 由于是正交投影或透视投影的简化，我们直接找在所有粒子中，当前 z 值最大的那个作为参考
    // 或者根据用户描述：从屏幕向 z 轴发射射线遇到的第一个剑
    
    let closestZ = -100; // 初始一个很小的值
    let found = false;
    
    this.particles.forEach(p => {
      // 找到离“屏幕”（通常 z 越大或者正方向）最近的剑
      // 这里假设 z 越大越靠近相机
      if (p.position.z > closestZ) {
        closestZ = p.position.z;
        found = true;
      }
    });
    
    if (!found) closestZ = 0;
    
    this.targetPointD.set(x, y, closestZ);
  }

  // 更新中指轨迹
  updateTrail(trail: TrailPoint[]) {
    this.currentTrail = trail;
    
    // 如果是 RELEASE 状态，检查是否已经过了延迟时间
    if (this.state === 'RELEASE') {
      const elapsedSeconds = (Date.now() - this.lastReleaseTime) / 1000;
      if (elapsedSeconds >= this.releaseTrailDelaySeconds && !this.canFollowTrailInRelease) {
        this.canFollowTrailInRelease = true;
        console.log(`RELEASE 延迟结束，现在可以跟随轨迹了`);
      }
    }
    
    // 检查是否应该跟随轨迹
    // TRACK 状态下：有轨迹就跟随
    // RELEASE 状态下：必须等待延迟时间过后才能跟随
    let shouldFollowTrail = false;
    if (this.state === 'TRACK') {
      shouldFollowTrail = trail.length > 3;
    } else if (this.state === 'RELEASE') {
      shouldFollowTrail = this.canFollowTrailInRelease && trail.length > 3;
    }
    
    if (shouldFollowTrail && !this.isFollowingTrail) {
      // 开始跟随轨迹 - 重置所有粒子的运动进度
      this.isFollowingTrail = true;
      this.particles.forEach(p => {
        p.trailProgress = 0; // 重置进度，开始新的先慢后快运动
      });
      this.assignParticlesToTrail();
      console.log('开始跟随中指轨迹，轨迹点数:', trail.length, '状态:', this.state);
    } else if (!shouldFollowTrail && this.isFollowingTrail) {
      // 停止跟随轨迹
      this.isFollowingTrail = false;
      this.particles.forEach(p => {
        p.trailProgress = 0; // 重置进度
      });
      this.updateParticleTargets(); // 恢复到正常状态
      console.log('停止跟随轨迹');
    }
  }

  // 将粒子分配到轨迹点上
  private assignParticlesToTrail() {
    if (this.currentTrail.length === 0) return;
    
    // 计算轨迹总长度
    let totalLength = 0;
    const segments: number[] = [];
    for (let i = 1; i < this.currentTrail.length; i++) {
      const segLen = this.currentTrail[i].position.distanceTo(this.currentTrail[i - 1].position);
      segments.push(segLen);
      totalLength += segLen;
    }
    
    // 缓动函数: 先慢后快再慢 (easeInOutCubic)
    const easeInOutCubic = (t: number): number => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    
    // 沿轨迹分布粒子，使用缓动函数
    this.particles.forEach((particle, index) => {
      const linearT = index / (this.count - 1);
      const easedT = easeInOutCubic(linearT);
      const targetDistance = easedT * totalLength;
      
      // 找到对应的轨迹段
      let currentDistance = 0;
      let trailIndex = 0;
      
      for (let i = 0; i < segments.length; i++) {
        if (currentDistance + segments[i] >= targetDistance) {
          trailIndex = i;
          break;
        }
        currentDistance += segments[i];
        trailIndex = i;
      }
      
      particle.trailIndex = Math.max(0, Math.min(trailIndex, this.currentTrail.length - 1));
    });
  }

  setState(state: SwordState) {
    if (this.state === state) return;
    
    console.log(`剑系统状态变更: ${this.state} -> ${state}`);
    const previousState = this.state;
    this.state = state;
    
    // 如果切换到 RELEASE 状态，记录时间并禁用轨迹跟随
    if (state === 'RELEASE') {
      this.lastReleaseTime = Date.now();
      this.canFollowTrailInRelease = false;
      console.log(`RELEASE 状态激活，${this.releaseTrailDelaySeconds}秒后开始跟随轨迹`);
    }
    
    // 记录当前位置作为动画起始位置
    this.particles.forEach(p => {
      p.startPosition.copy(p.position);
    });

    // 重置动画进度并启动新的缓动动画
    // 使用 GSAP 驱动动画进度从 0 到 1
    this.animationProgress = 0;
    gsap.to(this, {
      animationProgress: 1,
      duration: 1.2, // 动画持续时间
      ease: "power2.inOut", // GSAP 内置的先慢后快再慢曲线
      overwrite: true
    });
    
    // 根据状态更新粒子目标位置
    this.updateParticleTargets();
  }

  private updateParticleTargets() {
    switch (this.state) {
      case 'FOLD':
        // 聚拢成球体 - 保持相对坐标，不在这里加 centerPosition
        this.particles.forEach(particle => {
          this.setSpherePosition(particle);
        });
        break;
        
      case 'RELEASE':
        // 随机散开
        this.particles.forEach(particle => {
          this.setRandomPosition(particle);
        });
        break;
        
      case 'TRACK':
        // TRACK 状态：粒子将跟随中指轨迹，不需要设置固定目标位置
        // 实际的轨迹跟随在 update() 方法中通过 isFollowingTrail 控制
        break;
    }
  }

  /**
   * 更新每个粒子的状态和矩阵
   * @param time 场景运行时间
   * @param deltaTime 帧间隔时间
   */
  update(time: number, deltaTime: number = 0.016) {
    // 如果是聚拢状态，更新球体旋转角度
    if (this.state === 'FOLD') {
      // 增加旋转速度，使其更有动感
      this.sphereRotationAngle += this.sphereRotationSpeed * deltaTime;
    }

    // 更新每个粒子
    this.particles.forEach((particle, i) => {
      // 这里的 targetPos 最终应该是世界坐标
      let targetPos = new THREE.Vector3();
      
      // TRACK 状态下的特殊处理：跟随中指位置
      if (this.state === 'TRACK') {
        // 目标点 D：共享的 targetPointD
        targetPos.copy(this.targetPointD);
      } else if (this.isFollowingTrail && this.currentTrail.length > 1) {
        const linearT = i / (this.count - 1);
        const easedT = this.easeInOutCubic(linearT);
        const floatIndex = easedT * (this.currentTrail.length - 1);
        const baseIndex = Math.floor(floatIndex);
        const nextIndex = Math.min(baseIndex + 1, this.currentTrail.length - 1);
        const ratio = floatIndex - baseIndex;
        const p1 = this.currentTrail[baseIndex].position;
        const p2 = this.currentTrail[nextIndex].position;
        targetPos.copy(p1).lerp(p2, ratio);
        
        // 更新粒子的运动进度（用于先慢后快）
        // 每帧根据独立速度增加进度
        particle.trailProgress = Math.min(1, particle.trailProgress + particle.trailFollowSpeed * deltaTime * 3);
        
        // 应用缓动函数：先慢后快 (easeInQuad)
        const easeInQuad = (t: number): number => t * t;
        const easedProgress = easeInQuad(particle.trailProgress);
        
        // 轨迹状态下的抖动，随着进度增加而减少（开始抖动大，后来越来越稳定）
        const jitterAmount = (1 - easedProgress) * 0.8 + 0.2;
        targetPos.x += (Math.random() - 0.5) * jitterAmount;
        targetPos.y += (Math.random() - 0.5) * jitterAmount;
        targetPos.z += (Math.random() - 0.5) * jitterAmount;
      } else {
        // 非轨迹状态，基于相对 targetPosition 和当前 centerPosition 计算
        targetPos.copy(particle.targetPosition);
        
        if (this.state === 'FOLD') {
          // 剑球旋转逻辑：应用围绕中心点的 Z 轴顺时针旋转
          const rotationMatrix = new THREE.Matrix4().makeRotationZ(-this.sphereRotationAngle);
          targetPos.applyMatrix4(rotationMatrix);
        }
        
        // 加上实时中心点，使其跟随手部移动
        targetPos.add(this.centerPosition);
      }
      
      // 使用 Ease-In-Out 曲线进行平滑移动
      const stateTransitionFactor = this.animationProgress;
      
      // 使用每把剑的独立速度进行跟随
      let moveFactor: number;
      if (this.state === 'TRACK') {
        // TRACK 状态下使用随机速度
        moveFactor = particle.trackRandomSpeed;
      } else if (this.isFollowingTrail) {
        // 轨迹跟随状态：使用每把剑的独立速度和缓动进度
        const easeInQuad = (t: number): number => t * t;
        const easedProgress = easeInQuad(particle.trailProgress);
        moveFactor = particle.trailFollowSpeed * (0.5 + easedProgress * 1.5); // 先慢后快
      } else {
        // 非轨迹状态：使用统一速度
        moveFactor = 0.15;
      }
      
      // 计算插值后的目标位置
      const lerpedTarget = particle.startPosition.clone().lerp(targetPos, stateTransitionFactor);
      particle.position.lerp(lerpedTarget, moveFactor);
      
      // 添加轻微的浮动效果
      const floatOffset = new THREE.Vector3(
        Math.sin(time * 2 + i * 0.1) * 0.05,
        Math.cos(time * 1.5 + i * 0.15) * 0.05,
        Math.sin(time * 1.8 + i * 0.2) * 0.05
      );
      
      // 设置变换矩阵
      this.dummy.position.copy(particle.position).add(floatOffset);
      
      // 朝向控制
      if (this.isFollowingTrail && this.currentTrail.length > 1) {
        const linearT = i / (this.count - 1);
        const floatIndex = this.easeInOutCubic(linearT) * (this.currentTrail.length - 1);
        const idx = Math.floor(floatIndex);
        const nextIdx = Math.min(idx + 1, this.currentTrail.length - 1);
        const dir = this.currentTrail[nextIdx].position.clone().sub(this.currentTrail[idx].position);
        if (dir.lengthSq() > 0.0001) {
          this.dummy.lookAt(this.dummy.position.clone().add(dir));
          this.dummy.rotateX(-Math.PI / 2);
        }
      } else if (this.state === 'FOLD') {
        // 剑球状态：剑尖指向旋转的前进方向（切线方向）
        // 计算当前相对于中心点的向量，然后求切线
        const toCenter = this.centerPosition.clone().sub(this.dummy.position).normalize();
        // 顺时针旋转的切线 (x, y, 0) -> (y, -x, 0)
        const tangent = new THREE.Vector3(toCenter.y, -toCenter.x, 0).normalize();
        
        // 剑尖指向切线方向，并带有一定的向心倾斜
        const lookTarget = this.dummy.position.clone().add(tangent).lerp(this.centerPosition, 0.4);
        this.dummy.lookAt(lookTarget);
        this.dummy.rotateX(-Math.PI / 2);
      } else {
        if (this.state === 'RELEASE') {
          this.dummy.rotation.set(time * 0.5, time * 2.0 + i, 0);
        } else {
          // 指向中心或背向中心
          const awayDirection = particle.position.clone().sub(this.centerPosition).normalize();
          this.dummy.lookAt(particle.position.clone().add(awayDirection));
          this.dummy.rotateX(-Math.PI / 2);
        }
      }
      
      this.dummy.scale.setScalar(particle.scale);
      this.dummy.updateMatrix();
      this.swordParticles.setMatrixAt(i, this.dummy.matrix);
    });
    
    this.swordParticles.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * 获取 RELEASE 状态下的轨迹跟随信息
   * @returns {remainingSeconds: number, canFollow: boolean}
   */
  getReleaseTrailInfo() {
    if (this.state !== 'RELEASE') {
      return { remainingSeconds: 0, canFollow: false };
    }
    
    const elapsedSeconds = (Date.now() - this.lastReleaseTime) / 1000;
    const remainingSeconds = Math.max(0, this.releaseTrailDelaySeconds - elapsedSeconds);
    
    return {
      remainingSeconds: remainingSeconds,
      canFollow: this.canFollowTrailInRelease
    };
  }
}
