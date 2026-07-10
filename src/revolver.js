import * as THREE from "three";

export function createRevolver(gunMats, detail) {
  const group = new THREE.Group();
  const metal = gunMats.metal;
  const body = gunMats.body;
  const grip = gunMats.grip || gunMats.body;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.062, 0.16), body);
  frame.position.set(0, 0.012, -0.01);
  group.add(frame);

  const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.016, 0.19), body);
  topStrap.position.set(0, 0.05, -0.02);
  group.add(topStrap);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.24, 8), metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.21);
  group.add(barrel);

  const ejector = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.17, 6), metal);
  ejector.rotation.x = Math.PI / 2;
  ejector.position.set(0.014, 0.008, -0.18);
  group.add(ejector);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.02), metal);
  sight.position.set(0, 0.055, -0.315);
  group.add(sight);

  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.062, 12), metal);
  cylinder.rotation.x = Math.PI / 2;
  cylinder.position.set(0, 0.026, -0.055);
  group.add(cylinder);

  if (detail) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.006), body);
      flute.position.set(Math.cos(angle) * 0.027, 0.026 + Math.sin(angle) * 0.027, -0.055);
      flute.rotation.z = angle;
      group.add(flute);
    }
  }

  const hammerBase = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.014), metal);
  hammerBase.position.set(0, 0.055, 0.062);
  hammerBase.rotation.x = -0.5;
  group.add(hammerBase);
  const hammerSpur = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.024), metal);
  hammerSpur.position.set(0, 0.072, 0.075);
  hammerSpur.rotation.x = -0.7;
  group.add(hammerSpur);

  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 10, Math.PI), metal);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  guard.position.set(0, -0.026, 0.012);
  group.add(guard);

  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.008), metal);
  trigger.position.set(0, -0.024, 0.008);
  trigger.rotation.x = 0.35;
  group.add(trigger);

  const gripUpper = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.05, 0.045), grip);
  gripUpper.position.set(0, -0.03, 0.055);
  gripUpper.rotation.x = 0.42;
  group.add(gripUpper);
  const gripLower = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.055, 0.05), grip);
  gripLower.position.set(0, -0.072, 0.075);
  gripLower.rotation.x = 0.52;
  group.add(gripLower);
  const buttCap = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.052), metal);
  buttCap.position.set(0, -0.098, 0.085);
  buttCap.rotation.x = 0.52;
  group.add(buttCap);

  group.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
    }
  });

  return group;
}
