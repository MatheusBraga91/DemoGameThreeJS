import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

console.log('Archer.jsx file loaded');

const Archer = ({ scene, camera, position }) => {
  console.log('Archer component rendered', scene, position);
  const modelRef = useRef();
  const hitboxRef = useRef();
  const cubeRef = useRef();
  const movementRadiusRef = useRef();
  const [selected, setSelected] = useState(false);
  const [movingTo, setMovingTo] = useState(null);

  // For a 20x20 grid, each square is 1 unit
  const gridSquareSize = 1;
  const movementRadius = 7;
  const movementSpeed = 0.1; // units per frame (tweak as needed)

  // Only load the model and hitbox once (when scene/camera/position changes)
  useEffect(() => {
    if (!scene) {
      console.log('Archer: No scene provided');
      return;
    }
    console.log('Archer: useEffect running, attempting to load FBX...');
    const loader = new FBXLoader();
    loader.load(
      '/assets/models/characters/archer.fbx',
      (fbx) => {
        console.log('Archer: FBX loaded', fbx);
        // Scale and position the model to fit exactly inside 1x1x1 cube
        const bbox = new THREE.Box3().setFromObject(fbx);
        const size = bbox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = gridSquareSize / maxDimension;
        fbx.scale.set(scale, scale, scale);
        fbx.position.set(position.x, 0, position.z);
        const bottomY = bbox.min.y * scale;
        fbx.position.y = -bottomY;
        fbx.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        // Remove any previous model
        if (modelRef.current) scene.remove(modelRef.current);
        modelRef.current = fbx;
        scene.add(fbx);

        // Remove any previous hitbox
        if (hitboxRef.current) scene.remove(hitboxRef.current);
        // Create hitbox that matches the grid square
        const hitboxGeometry = new THREE.BoxGeometry(gridSquareSize, gridSquareSize, gridSquareSize);
        const hitboxMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          wireframe: true,
          transparent: true,
          opacity: 0.5
        });
        const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
        hitbox.position.copy(fbx.position);
        hitbox.position.y = gridSquareSize / 2;
        hitboxRef.current = hitbox;
        scene.add(hitbox);
      },
      undefined,
      (error) => {
        console.error('Archer: Error loading archer model:', error);
        // Add a fallback cube so we can see if the code runs at all
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        cube.position.set(position.x, 0.5, position.z);
        cubeRef.current = cube;
        scene.add(cube);
      }
    );
    // Also add a cube if the FBXLoader never calls back (for debugging)
    setTimeout(() => {
      if (!modelRef.current && !cubeRef.current) {
        console.log('Archer: FBX did not load after 3 seconds, adding fallback cube');
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        cube.position.set(position.x, 0.5, position.z);
        cubeRef.current = cube;
        scene.add(cube);
      }
    }, 3000);
    return () => {
      if (modelRef.current) scene.remove(modelRef.current);
      if (hitboxRef.current) scene.remove(hitboxRef.current);
      if (cubeRef.current) scene.remove(cubeRef.current);
    };
  }, [scene, camera, position]);

  // Handle hover and selection logic (depends on selected)
  useEffect(() => {
    if (!scene || !camera) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      if (!hitboxRef.current) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(hitboxRef.current);
      if (selected) {
        hitboxRef.current.material.color.set(0x00ff00); // Green if selected
      } else if (intersects.length > 0) {
        hitboxRef.current.material.color.set(0x0000ff); // Blue on hover
      } else {
        hitboxRef.current.material.color.set(0xff0000); // Red otherwise
      }
    };

    const handleClick = (event) => {
      if (!hitboxRef.current) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(hitboxRef.current);
      if (intersects.length > 0) {
        setSelected(true);
      } else if (selected && modelRef.current && movementRadiusRef.current) {
        // Only handle movement if selected
        // Raycast to the floor
        const floor = scene.children.find(obj => obj.isMesh && obj.geometry && obj.geometry.type === 'PlaneGeometry');
        if (!floor) return;
        const floorIntersects = raycaster.intersectObject(floor);
        if (floorIntersects.length > 0) {
          const point = floorIntersects[0].point;
          // Check if within movement radius
          const center = modelRef.current.position;
          const dist = Math.sqrt(
            Math.pow(point.x - center.x, 2) +
            Math.pow(point.z - center.z, 2)
          );
          if (dist <= movementRadius) {
            setMovingTo({ x: point.x, z: point.z });
          }
        }
        // Deselect if clicked outside movement radius or not on floor
        // else {
        //   setSelected(false);
        // }
      } else {
        setSelected(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [scene, camera, selected]);

  // Show/hide movement radius when selected
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    if (selected) {
      // Create movement radius circle
      const geometry = new THREE.RingGeometry(movementRadius - 0.1, movementRadius, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const circle = new THREE.Mesh(geometry, material);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(modelRef.current.position.x, 0.01, modelRef.current.position.z);
      movementRadiusRef.current = circle;
      scene.add(circle);
    } else {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
      }
    }
    // Clean up on unmount
    return () => {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
      }
    };
  }, [scene, selected]);

  // Animate movement
  useEffect(() => {
    if (!modelRef.current || !movingTo) return;
    let frameId;
    const animateMove = () => {
      const model = modelRef.current;
      const hitbox = hitboxRef.current;
      const current = model.position;
      const target = new THREE.Vector3(movingTo.x, current.y, movingTo.z);
      const direction = new THREE.Vector3(target.x - current.x, 0, target.z - current.z);
      const distance = direction.length();
      if (distance > 0.05) {
        direction.normalize();
        // Move a bit toward the target
        current.x += direction.x * movementSpeed;
        current.z += direction.z * movementSpeed;
        // Rotate to face direction
        model.rotation.y = Math.atan2(direction.x, direction.z);
        // Move hitbox too
        if (hitbox) {
          hitbox.position.x = current.x;
          hitbox.position.z = current.z;
        }
        // Move movement radius circle too
        if (movementRadiusRef.current) {
          movementRadiusRef.current.position.x = current.x;
          movementRadiusRef.current.position.z = current.z;
        }
        frameId = requestAnimationFrame(animateMove);
      } else {
        // Snap to target
        current.x = target.x;
        current.z = target.z;
        if (hitbox) {
          hitbox.position.x = current.x;
          hitbox.position.z = current.z;
        }
        if (movementRadiusRef.current) {
          movementRadiusRef.current.position.x = current.x;
          movementRadiusRef.current.position.z = current.z;
        }
        setMovingTo(null);
      }
    };
    animateMove();
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [movingTo]);

  return null;
};

export default Archer; 