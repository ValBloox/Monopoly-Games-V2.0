import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import audio from "../game/audio";

const params = {
  numberOfDice: 2,
  segments: 24,
  edgeRadius: 0.07,
  notchRadius: 0.12,
  notchDepth: 0.1,
};

const offset = 0.23;
const eps = 0.12;

const notchWave = (v) => {
  const scaled = Math.PI * Math.max(-1, Math.min(1, v / params.notchRadius));
  return params.notchDepth * (Math.cos(scaled) + 1);
};

const notch = ([a, b]) => notchWave(a) * notchWave(b);

function createDiceGeometry() {
  let geometry = new THREE.BoxGeometry(
    1,
    1,
    1,
    params.segments,
    params.segments,
    params.segments
  );

  const positionAttribute = geometry.attributes.position;
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for (let i = 0; i < positionAttribute.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);

    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y),
      Math.sign(position.z)
    ).multiplyScalar(subCubeHalfSize);

    const addition = new THREE.Vector3().subVectors(position, subCube);

    if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.normalize().multiplyScalar(params.edgeRadius);
      position = subCube.add(addition);
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.y) > subCubeHalfSize
    ) {
      addition.z = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.y = subCube.y + addition.y;
    } else if (
      Math.abs(position.x) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.y = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.z = subCube.z + addition.z;
    } else if (
      Math.abs(position.y) > subCubeHalfSize &&
      Math.abs(position.z) > subCubeHalfSize
    ) {
      addition.x = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.y = subCube.y + addition.y;
      position.z = subCube.z + addition.z;
    }

    if (Math.abs(position.y - 0.5) < 1e-3) {
      position.y -= notch([position.x, position.z]);
    } else if (Math.abs(position.x - 0.5) < 1e-3) {
      position.x -= notch([position.y + offset, position.z + offset]);
      position.x -= notch([position.y - offset, position.z - offset]);
    } else if (Math.abs(position.z - 0.5) < 1e-3) {
      position.z -= notch([position.x - offset, position.y + offset]);
      position.z -= notch([position.x, position.y]);
      position.z -= notch([position.x + offset, position.y - offset]);
    } else if (Math.abs(position.z + 0.5) < 1e-3) {
      position.z += notch([position.x + offset, position.y + offset]);
      position.z += notch([position.x + offset, position.y - offset]);
      position.z += notch([position.x - offset, position.y + offset]);
      position.z += notch([position.x - offset, position.y - offset]);
    } else if (Math.abs(position.x + 0.5) < 1e-3) {
      position.x += notch([position.y + offset, position.z + offset]);
      position.x += notch([position.y + offset, position.z - offset]);
      position.x += notch([position.y, position.z]);
      position.x += notch([position.y - offset, position.z + offset]);
      position.x += notch([position.y - offset, position.z - offset]);
    } else if (Math.abs(position.y + 0.5) < 1e-3) {
      position.y += notch([position.x + offset, position.z + offset]);
      position.y += notch([position.x + offset, position.z]);
      position.y += notch([position.x + offset, position.z - offset]);
      position.y += notch([position.x - offset, position.z + offset]);
      position.y += notch([position.x - offset, position.z]);
      position.y += notch([position.x - offset, position.z - offset]);
    }

    positionAttribute.setXYZ(i, position.x, position.y, position.z);
  }

  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  geometry = BufferGeometryUtils.mergeVertices(geometry);
  geometry.computeVertexNormals();

  return geometry;
}

function createInnerGeometry() {
  const baseGeometry = new THREE.PlaneGeometry(
    1 - 2 * params.edgeRadius,
    1 - 2 * params.edgeRadius
  );
  const innerOffset = 0.48;
  return BufferGeometryUtils.mergeGeometries(
    [
      baseGeometry.clone().translate(0, 0, innerOffset),
      baseGeometry.clone().translate(0, 0, -innerOffset),
      baseGeometry.clone().rotateX(0.5 * Math.PI).translate(0, -innerOffset, 0),
      baseGeometry.clone().rotateX(0.5 * Math.PI).translate(0, innerOffset, 0),
      baseGeometry.clone().rotateY(0.5 * Math.PI).translate(-innerOffset, 0, 0),
      baseGeometry.clone().rotateY(0.5 * Math.PI).translate(innerOffset, 0, 0),
    ],
    false
  );
}

function createDiceMesh() {
  const outer = new THREE.Mesh(
    createDiceGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0xf5f1ea,
      roughness: 0.42,
      metalness: 0.08,
    })
  );
  outer.castShadow = true;

  const inner = new THREE.Mesh(
    createInnerGeometry(),
    new THREE.MeshStandardMaterial({
      color: 0x1a140f,
      roughness: 0.2,
      metalness: 0.15,
      side: THREE.DoubleSide,
    })
  );

  const group = new THREE.Group();
  group.add(inner, outer);
  return group;
}

function getDiceValue(body) {
  const euler = new CANNON.Vec3();
  body.quaternion.toEuler(euler);

  const isZero = (angle) => Math.abs(angle) < eps;
  const isHalfPi = (angle) => Math.abs(angle - 0.5 * Math.PI) < eps;
  const isMinusHalfPi = (angle) => Math.abs(0.5 * Math.PI + angle) < eps;
  const isPiOrMinusPi = (angle) =>
    Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps;

  if (isZero(euler.z)) {
    if (isZero(euler.x)) return 1;
    if (isHalfPi(euler.x)) return 4;
    if (isMinusHalfPi(euler.x)) return 3;
    if (isPiOrMinusPi(euler.x)) return 6;
    return null;
  }
  if (isHalfPi(euler.z)) return 2;
  if (isMinusHalfPi(euler.z)) return 5;
  return null;
}

export default function Dice3D({ rollToken = 0, onRollComplete, valueLabel = [1, 1] }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const worldRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const diceRef = useRef([]);
  const rafRef = useRef(null);
  const lastRollTokenRef = useRef(0);
  const resultSetRef = useRef([]);
  const onRollCompleteRef = useRef(onRollComplete);
  const rollActiveRef = useRef(false);

  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 6.2, 8.8);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(4, 10, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    scene.add(ambient, dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.ShadowMaterial({ opacity: 0.18 })
    );
    floor.receiveShadow = true;
    floor.position.y = -2.4;
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -50, 0),
      allowSleep: true,
    });
    world.defaultContactMaterial.restitution = 0.35;

    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
    });
    floorBody.position.set(0, -2.4, 0);
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(floorBody);

    // Invisible physical border so dice stay inside center board lane.
    const bounds = { x: 4.25, z: 3.15, y: -0.2, h: 2.8, t: 0.38 };
    const makeWall = (x, z, halfX, halfZ) => {
      const wall = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(halfX, bounds.h, halfZ)),
      });
      wall.position.set(x, bounds.y, z);
      world.addBody(wall);
    };
    makeWall(bounds.x, 0, bounds.t, bounds.z + bounds.t);
    makeWall(-bounds.x, 0, bounds.t, bounds.z + bounds.t);
    makeWall(0, bounds.z, bounds.x, bounds.t);
    makeWall(0, -bounds.z, bounds.x, bounds.t);

    const diceProto = createDiceMesh();
    const diceItems = [];

    const handleSleep = (dice, idx) => {
      if (!rollActiveRef.current) return;
      dice.body.allowSleep = false;
      const value = getDiceValue(dice.body);
      if (!value) {
        dice.body.allowSleep = true;
        return;
      }
      resultSetRef.current[idx] = value;
      if (
        resultSetRef.current.length === params.numberOfDice &&
        resultSetRef.current.every(Boolean) &&
        typeof onRollCompleteRef.current === "function"
      ) {
        const results = [...resultSetRef.current];
        rollActiveRef.current = false;
        setTimeout(() => onRollCompleteRef.current(results), 120);
      }
    };

    for (let i = 0; i < params.numberOfDice; i++) {
      const mesh = diceProto.clone();
      scene.add(mesh);

      const body = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
        sleepTimeLimit: 0.12,
      });
      body.linearDamping = 0.1;
      body.angularDamping = 0.1;
      body.position.set(i === 0 ? -1 : 1, 1.6, 0);
      world.addBody(body);
      body.addEventListener("sleep", () => handleSleep({ mesh, body }, i));
      body.addEventListener("collide", (ev) => {
        if (!rollActiveRef.current) return;
        if (ev.body === floorBody) {
          const impact = Math.min(1, Math.max(0.1, ev.contact?.getImpactVelocityAlongNormal?.() || 0));
          audio.diceHit(impact / 8);
        }
      });

      diceItems.push({ mesh, body });
    }

    const resize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth || 320;
      const height = mountRef.current.clientHeight || 220;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const render = () => {
      world.fixedStep();
      diceItems.forEach((d) => {
        const px = d.body.position.x;
        const pz = d.body.position.z;
        if (Math.abs(px) > bounds.x) {
          d.body.position.x = Math.sign(px) * bounds.x;
          d.body.velocity.x *= -0.42;
        }
        if (Math.abs(pz) > bounds.z) {
          d.body.position.z = Math.sign(pz) * bounds.z;
          d.body.velocity.z *= -0.42;
        }
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
      });
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    sceneRef.current = scene;
    worldRef.current = world;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    diceRef.current = diceItems;

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!diceRef.current.length) return;
    if (!rollToken || rollToken === lastRollTokenRef.current) return;
    lastRollTokenRef.current = rollToken;
    rollActiveRef.current = true;
    resultSetRef.current = new Array(params.numberOfDice).fill(null);

    diceRef.current.forEach((d, idx) => {
      d.body.allowSleep = true;
      d.body.velocity.setZero();
      d.body.angularVelocity.setZero();
      d.body.position = new CANNON.Vec3(idx === 0 ? 1.45 : -1.45, 3.2 + idx * 0.15, -0.25 + idx * 0.15);
      d.mesh.position.copy(d.body.position);

      d.mesh.rotation.set(
        2 * Math.PI * Math.random(),
        2 * Math.PI * Math.random(),
        2 * Math.PI * Math.random()
      );
      d.body.quaternion.copy(d.mesh.quaternion);
      d.body.angularVelocity.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 26
      );

      const force = 2.8 + 1.8 * Math.random();
      const lateral = idx === 0 ? -1 : 1;
      d.body.applyImpulse(
        new CANNON.Vec3(lateral * force, force * 1.05, (Math.random() - 0.5) * 1.2),
        new CANNON.Vec3((Math.random() - 0.5) * 0.32, (Math.random() - 0.5) * 0.2, 0.28)
      );
    });
  }, [rollToken]);

  return (
    <div className="dice-3d-stage">
      <div className="dice-3d-mount" ref={mountRef} />
      <div className="dice-3d-values">
        <span>{valueLabel[0]}</span>
        <span>{valueLabel[1]}</span>
      </div>
    </div>
  );
}
