import * as THREE from 'three';
import { CFG } from '../config.js';

const C = {
  stable: new THREE.Color('#4b5058'),
  unstable: new THREE.Color('#6c7280'),
  warning: new THREE.Color('#a57b3d'),
  scar: new THREE.Color('#596cd6')
};

export class GameRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.world = world;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.setClearColor(0x090b0f, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x090b0f, 48, 92);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 180);
    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.cameraTarget = new THREE.Vector3();

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.hemiLight = new THREE.HemisphereLight(0xaebbd0, 0x20242a, 0.45);
    this.sunLight = new THREE.DirectionalLight(0xd9e2ef, 0.8);
    this.sunLight.position.set(-20, 35, 15);
    this.scene.add(this.ambientLight, this.hemiLight, this.sunLight);

    this.lightingMode = 'debug';
    this.applyLightingMode();

    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.chunkMeshes = new Map();
    this.entityMeshes = new Map();
    this.occluderMeshes = [];
    this.hiddenTiles = new Set();

    this.targetBox = this.makeTargetBox();
    this.scene.add(this.targetBox);

    this.navGroup = new THREE.Group();
    this.scene.add(this.navGroup);

    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);

    this.buildChunks(world.terrain);
    this.resize();

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', event => {
      if (event.code === 'KeyL' && !event.repeat) this.toggleLighting();
    });
  }

  applyLightingMode() {
    const debug = this.lightingMode === 'debug';

    if (debug) {
      this.ambientLight.intensity = 0.35;
      this.hemiLight.intensity = 0.55;
      this.sunLight.intensity = 0.9;
      this.renderer.setClearColor(0x20242a, 1);
      this.scene.fog.color.setHex(0x20242a);
      this.scene.fog.near = 58;
      this.scene.fog.far = 118;
    } else {
      this.ambientLight.intensity = 0.12;
      this.hemiLight.intensity = 0.22;
      this.sunLight.intensity = 0.42;
      this.renderer.setClearColor(0x090b0f, 1);
      this.scene.fog.color.setHex(0x090b0f);
      this.scene.fog.near = 48;
      this.scene.fog.far = 92;
    }
  }

  toggleLighting() {
    this.lightingMode = this.lightingMode === 'debug' ? 'moody' : 'debug';
    this.applyLightingMode();
    if (this.world?.debug) {
      this.world.debug.banner = `LIGHTING: ${this.lightingMode.toUpperCase()}`;
      this.world.debug.bannerUntil = this.world.time + 1.5;
    }
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildChunks(terrain) {
    for (let cz = 0; cz < terrain.size / CFG.CHUNK_SIZE; cz++) {
      for (let cx = 0; cx < terrain.size / CFG.CHUNK_SIZE; cx++) {
        this.createChunk(cx, cz, terrain);
      }
    }
  }

  createChunk(cx, cz, terrain) {
    const count = CFG.CHUNK_SIZE * CFG.CHUNK_SIZE;
    const geom = new THREE.BoxGeometry(CFG.TILE_SIZE * 0.98, 1, CFG.TILE_SIZE * 0.98);
    geom.computeVertexNormals();

    // Instanced colors are supplied by setColorAt(). Do not enable vertexColors here:
    // BoxGeometry has no per-vertex color attribute, and enabling it multiplies instance
    // colors by a missing/default-zero color attribute in WebGL.
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    mesh.count = count;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.userData = { cx, cz };

    this.root.add(mesh);
    this.chunkMeshes.set(`${cx},${cz}`, mesh);

    let i = 0;
    for (let lz = 0; lz < CFG.CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CFG.CHUNK_SIZE; lx++) {
        this.updateTileInstance(
          terrain,
          cx * CFG.CHUNK_SIZE + lx,
          cz * CFG.CHUNK_SIZE + lz,
          mesh,
          i
        );
        i++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }

  updateDirty(terrain, dirty) {
    const touched = new Set();

    for (const { x, z } of dirty) {
      const cx = Math.floor(x / CFG.CHUNK_SIZE);
      const cz = Math.floor(z / CFG.CHUNK_SIZE);
      const mesh = this.chunkMeshes.get(`${cx},${cz}`);
      if (!mesh) continue;

      const lx = x % CFG.CHUNK_SIZE;
      const lz = z % CFG.CHUNK_SIZE;
      const i = lz * CFG.CHUNK_SIZE + lx;
      this.updateTileInstance(terrain, x, z, mesh, i);
      touched.add(mesh);
    }

    for (const mesh of touched) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
    }
  }

  updateTileInstance(terrain, x, z, mesh, index, forceHide = false) {
    const tile = terrain.get(x, z);
    const top = tile.height * CFG.HEIGHT_STEP;
    const slice = this.world.debug.sliceLevel;
    const hide = forceHide || (slice !== null && tile.height > slice);
    const matrix = new THREE.Matrix4();

    if (hide) {
      matrix.compose(
        new THREE.Vector3((x + 0.5) * CFG.TILE_SIZE, -100, (z + 0.5) * CFG.TILE_SIZE),
        new THREE.Quaternion(),
        new THREE.Vector3(0.001, 0.001, 0.001)
      );
    } else {
      matrix.compose(
        new THREE.Vector3((x + 0.5) * CFG.TILE_SIZE, top / 2, (z + 0.5) * CFG.TILE_SIZE),
        new THREE.Quaternion(),
        new THREE.Vector3(1, Math.max(0.05, top), 1)
      );
    }

    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(
      index,
      tile.scarType === 'fulgurite'
        ? C.scar
        : tile.warning
          ? C.warning
          : tile.unstable.length
            ? C.unstable
            : C.stable
    );
  }

  restoreHidden() {
    const touched = new Set();

    for (const key of this.hiddenTiles) {
      const [x, z] = key.split(',').map(Number);
      const { mesh, index } = this.tileInstance(x, z);
      if (!mesh) continue;
      this.updateTileInstance(this.world.terrain, x, z, mesh, index);
      touched.add(mesh);
    }

    for (const mesh of touched) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }

    this.hiddenTiles.clear();
    for (const m of this.occluderMeshes) this.scene.remove(m);
    this.occluderMeshes = [];
  }

  updateOcclusion() {
    this.restoreHidden();
    const p = this.world.player;
    const t = this.world.terrain.worldToTile(p.position.x, p.position.z);
    const ph = this.world.terrain.heightAt(t.x, t.z);

    for (let d = 1; d <= 7; d++) {
      for (const side of [-1, 0, 1]) {
        const x = t.x + d;
        const z = t.z + d + side;
        if (!this.world.terrain.inBounds(x, z)) continue;

        const tile = this.world.terrain.get(x, z);
        if (tile.height <= ph) continue;

        const { mesh, index } = this.tileInstance(x, z);
        if (!mesh) continue;

        this.updateTileInstance(this.world.terrain, x, z, mesh, index, true);
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
        this.hiddenTiles.add(`${x},${z}`);

        const top = tile.height * CFG.HEIGHT_STEP;
        const g = new THREE.BoxGeometry(
          CFG.TILE_SIZE * 0.98,
          Math.max(0.05, top),
          CFG.TILE_SIZE * 0.98
        );
        const mat = new THREE.MeshBasicMaterial({
          color: 0x8c949e,
          transparent: true,
          opacity: 0.25,
          depthWrite: false
        });
        const ghost = new THREE.Mesh(g, mat);
        ghost.position.set((x + 0.5) * CFG.TILE_SIZE, top / 2, (z + 0.5) * CFG.TILE_SIZE);
        this.scene.add(ghost);
        this.occluderMeshes.push(ghost);
      }
    }
  }

  tileInstance(x, z) {
    const cx = Math.floor(x / CFG.CHUNK_SIZE);
    const cz = Math.floor(z / CFG.CHUNK_SIZE);
    const mesh = this.chunkMeshes.get(`${cx},${cz}`);
    return {
      mesh,
      index: (z % CFG.CHUNK_SIZE) * CFG.CHUNK_SIZE + (x % CFG.CHUNK_SIZE)
    };
  }

  syncEntities(world) {
    const alive = new Set();

    for (const entity of world.entities.all()) {
      alive.add(entity.id);
      let mesh = this.entityMeshes.get(entity.id);

      if (!mesh) {
        mesh = entity.type === 'player' ? this.makePlayer() : this.makeHusk();
        this.scene.add(mesh);
        this.entityMeshes.set(entity.id, mesh);
      }

      mesh.position.set(
        entity.position.x,
        entity.position.y + (entity.type === 'player' ? 1.05 : 0.9),
        entity.position.z
      );

      if (entity.type === 'husk') {
        const ratio = Math.max(0, entity.health / entity.maxHealth);
        mesh.children[1].scale.x = ratio;
        mesh.children[0].material.color.set(
          world.fxHit?.entityId === entity.id && world.fxHit.until > world.time
            ? 0xffffff
            : 0x993f3f
        );
      }
    }

    for (const [id, mesh] of this.entityMeshes) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        this.entityMeshes.delete(id);
      }
    }
  }

  makePlayer() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.38, 0.9, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0x5c6ed0 })
    );
    g.add(body);

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.16),
      new THREE.MeshBasicMaterial({ color: 0xb5d8ff })
    );
    crystal.position.set(0.42, 0.7, 0);
    g.add(crystal);
    return g;
  }

  makeHusk() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.38, 0.75, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0x993f3f })
    );
    g.add(body);

    const barBg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x291619, side: THREE.DoubleSide })
    );
    barBg.position.y = 1.35;
    barBg.rotation.x = -Math.PI / 2;
    g.add(barBg);
    return g;
  }

  makeTargetBox() {
    return new THREE.Mesh(
      new THREE.BoxGeometry(CFG.TILE_SIZE * 3, 0.08, CFG.TILE_SIZE * 3),
      new THREE.MeshBasicMaterial({
        color: 0x5fa86c,
        transparent: true,
        opacity: 0.3,
        depthWrite: false
      })
    );
  }

  updateTarget(tile, valid = true, shape = 'single') {
    if (!tile) {
      this.targetBox.visible = false;
      return;
    }

    this.targetBox.visible = true;
    const c = this.world.terrain.tileCenter(tile.x, tile.z);
    this.targetBox.position.set(c.x, c.y + 0.08, c.z);
    const scale = shape === 'shape' ? 1 : 1 / 3;
    this.targetBox.scale.set(scale, 1, scale);
    this.targetBox.material.color.set(valid ? 0x5fa86c : 0xbe4650);
  }

  pickTile(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const hits = this.raycaster.intersectObjects([...this.chunkMeshes.values()], false);
    if (!hits.length) return null;

    const p = hits[0].point;
    const t = this.world.terrain.worldToTile(p.x, p.z);
    return this.world.terrain.inBounds(t.x, t.z) ? t : null;
  }

  updateCamera(dt) {
    const p = this.world.player;
    const pt = this.world.terrain.worldToTile(p.position.x, p.position.z);
    const elev = this.world.terrain.heightAt(pt.x, pt.z);
    const distance = 32 + Math.max(0, elev - CFG.SPAWN_HEIGHT) * 0.8;
    const pitch = THREE.MathUtils.degToRad(52);
    const yaw = THREE.MathUtils.degToRad(45);
    const horizontal = distance * Math.cos(pitch);
    const height = distance * Math.sin(pitch);
    const target = new THREE.Vector3(p.position.x, p.position.y + 0.8, p.position.z);

    this.cameraTarget.lerp(target, 1 - Math.exp(-dt / 0.12));
    this.camera.position.set(
      this.cameraTarget.x + Math.cos(yaw) * horizontal,
      this.cameraTarget.y + height,
      this.cameraTarget.z + Math.sin(yaw) * horizontal
    );
    this.camera.lookAt(this.cameraTarget);
  }

  updateFx(world) {
    while (this.fxGroup.children.length) this.fxGroup.remove(this.fxGroup.children[0]);

    if (world.fx?.until > world.time && world.fx.type === 'lightning') {
      const pts = world.fx.points.map(p => new THREE.Vector3(p.x, p.y + 1, p.z));
      if (pts.length >= 2) {
        this.fxGroup.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x9cc5ff })
          )
        );
      }
    }

    if (
      world.fx?.until > world.time &&
      (world.fx.type === 'terrace' || world.fx.type === 'hollow')
    ) {
      const t = world.fx.target;
      const c = this.world.terrain.tileCenter(t.x, t.z);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 2.2, 24),
        new THREE.MeshBasicMaterial({
          color: world.fx.type === 'terrace' ? 0xaec5ff : 0x6f83bd,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, c.y + 0.12, c.z);
      this.fxGroup.add(ring);
    }
  }

  updateNavOverlay() {
    while (this.navGroup.children.length) this.navGroup.remove(this.navGroup.children[0]);
    if (!this.world.debug.navVisible) return;

    for (const husk of this.world.entities.all('husk')) {
      if (!husk.path?.length) continue;

      const pts = husk.path.slice(husk.pathIndex || 0).map(t => {
        const c = this.world.terrain.tileCenter(t.x, t.z);
        return new THREE.Vector3(c.x, c.y + 0.15, c.z);
      });

      if (pts.length < 2) continue;
      this.navGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x76e0a4 })
        )
      );
    }
  }

  render(world, dt, target, spellMode = 'single') {
    this.world = world;

    if (world.renderDirty?.length) {
      this.updateDirty(world.terrain, world.renderDirty);
      world.renderDirty = [];
    }

    this.syncEntities(world);
    this.updateCamera(dt);
    this.updateOcclusion();
    this.updateFx(world);
    this.updateNavOverlay();

    let valid = false;
    if (target) {
      const c = world.terrain.tileCenter(target.x, target.z);
      const range = Math.hypot(
        c.x - world.player.position.x,
        c.z - world.player.position.z
      );
      valid =
        range <=
        (spellMode === 'lightning'
          ? CFG.SPELLS.lightning.range
          : CFG.SPELLS.terrace.range);
    }

    this.updateTarget(target, valid, spellMode === 'shape' ? 'shape' : 'single');
    this.renderer.render(this.scene, this.camera);
  }
}
