import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedCharacter, clearSelectedCharacter, openAttackOptions, closeAttackOptions } from '../redux/uiSlice';
import { setSelected } from '../redux/archerSlice';
import AttackOptions from './AttackOptions';
import { setIsInMovementRange } from '../redux/goblinSlice';
import { setCharacterSelected } from '../redux/sceneState';

console.log('Archer.jsx file loaded');

const Archer = ({ scene, camera, position }) => {
  const dispatch = useDispatch();
  const selectedCharacter = useSelector(state => state.ui.selectedCharacter);
  const isSelected = useSelector(state => state.archer.selected);
  const attackOptionsOpen = useSelector(state => state.ui.attackOptionsOpen);
  const modelRef = useRef();
  const hitboxRef = useRef();
  const cubeRef = useRef();
  const movementRadiusRef = useRef();
  const attackAreaRef = useRef();
  const [movingTo, setMovingTo] = useState(null);
  const [attackOptionsPosition, setAttackOptionsPosition] = useState(null);

  // For a 20x20 grid, each square is 1 unit
  const gridSquareSize = 1;
  const movementRadius = 5;
  const attackRange = 8; // Attack range is 8 units
  const movementSpeed = 0.03; // units per frame (tweak as needed)

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
          new THREE.MeshBasicMaterial({ color: 0x0000ff })
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
      if (movementRadiusRef.current) scene.remove(movementRadiusRef.current);
      if (attackAreaRef.current) scene.remove(attackAreaRef.current);
    };
  }, [scene, camera, position]);

  // Handle hover and selection logic (no local selected state)
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
      if (isSelected) {
        hitboxRef.current.material.color.set(0x00ff00); // Green if selected
      } else if (intersects.length > 0) {
        hitboxRef.current.material.color.set(0x0000ff); // Blue on hover
      } else {
        hitboxRef.current.material.color.set(0xff0000); // Red otherwise
      }
    };

    const handleClick = (event) => {
      if (attackOptionsOpen) return; // Block all scene clicks if UI is open
      if (!scene || !camera) return;
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Get ALL intersected objects (order matters - first in array is closest)
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 1. Always check hitbox first (only way to deselect)
      if (hitboxRef.current) {
        const hitboxIntersects = raycaster.intersectObject(hitboxRef.current);
        if (hitboxIntersects.length > 0) {
          if (isSelected) {
            // Clicked hitbox while selected - deselect
            console.log('Deselecting archer: clicked on hitbox while selected');
            dispatch(clearSelectedCharacter());
            dispatch(setSelected(false));
            dispatch(setCharacterSelected(false));
          } else {
            // Check if any character is already selected
            if (selectedCharacter) {
              console.log('Cannot select archer: another character is already selected');
              return;
            }
            // Clicked hitbox while not selected - select
            console.log('Selecting archer: clicked on hitbox while not selected');
            dispatch(setSelectedCharacter({ type: 'archer', id: 1 }));
            dispatch(setSelected(true));
            dispatch(setCharacterSelected(true));
          }
          return;
        }
      }

      // 2. If archer is selected, handle goblin click for attack
      if (isSelected) {
        // Find goblin mesh (red box)
        const goblinIntersect = intersects.find(intersect =>
          intersect.object.isMesh &&
          intersect.object.geometry &&
          intersect.object.geometry.type === 'BoxGeometry' &&
          intersect.object.material.color.getHex() === 0x0000ff
        );
        if (goblinIntersect && modelRef.current) {
          const goblinPosition = goblinIntersect.object.position;
          const archerPosition = modelRef.current.position;
          const dist = Math.sqrt(
            Math.pow(archerPosition.x - goblinPosition.x, 2) +
            Math.pow(archerPosition.z - goblinPosition.z, 2)
          );
          const inMove = dist <= movementRadius;
          const inAttack = dist > movementRadius && dist <= attackRange;
          console.log('Archer click on goblin:', { dist, movementRadius, attackRange, inMove, inAttack });
          dispatch(setIsInMovementRange(inMove));

          // If in movement range, prevent goblin selection and return
          if (inMove) {
            console.log('Cannot select goblin: in movement range');
            return;
          }

          // If in attack range, show attack options
          if (inAttack) {
            console.log('Showing attack options UI');
            setAttackOptionsPosition({ x: event.clientX, y: event.clientY });
            dispatch(openAttackOptions());
            return;
          }
        }

        // Then find the floor intersect (if any)
        const floorIntersect = intersects.find(intersect =>
          intersect.object.isMesh &&
          intersect.object.geometry?.type === 'PlaneGeometry'
        );

        if (floorIntersect && modelRef.current) {
          const point = floorIntersect.point;
          const center = modelRef.current.position;
          const dist = Math.sqrt(
            Math.pow(point.x - center.x, 2) +
            Math.pow(point.z - center.z, 2)
          );

          // If clicked inside movement radius (whether directly on floor or through UI)
          if (dist <= movementRadius) {
            console.log('Moving archer: clicked inside movement radius');
            setMovingTo({ x: point.x, z: point.z });
            return;
          }

          // If clicked inside attack radius but outside movement radius, do nothing (prevent deselection)
          if (dist > movementRadius && dist <= attackRange) {
            console.log('Clicked inside attack radius - maintaining selection');
            return;
          }
        }
        // If not goblin in attack range or movement, deselect
        console.log('Deselecting archer: clicked outside movement and attack radius');
        dispatch(clearSelectedCharacter());
        dispatch(setSelected(false));
        dispatch(setCharacterSelected(false));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [scene, camera, isSelected, dispatch, attackOptionsOpen]);

  // Show/hide movement radius and attack area when selected
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    if (isSelected) {
      // Create movement radius circle
      const geometry = new THREE.RingGeometry(movementRadius - 0.1, movementRadius, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthTest: false // This makes it render on top of other objects
      });
      const circle = new THREE.Mesh(geometry, material);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(modelRef.current.position.x, 0.01, modelRef.current.position.z);
      movementRadiusRef.current = circle;
      scene.add(circle);

      // Create attack area (red ring around movement radius)
      const attackGeometry = new THREE.RingGeometry(movementRadius, attackRange, 64);
      const attackMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      const attackArea = new THREE.Mesh(attackGeometry, attackMaterial);
      attackArea.rotation.x = -Math.PI / 2;
      attackArea.position.set(modelRef.current.position.x, 0.02, modelRef.current.position.z);
      attackAreaRef.current = attackArea;
      scene.add(attackArea);
    } else {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
      }
      if (attackAreaRef.current) {
        scene.remove(attackAreaRef.current);
        attackAreaRef.current = null;
      }
    }
    // Clean up on unmount
    return () => {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
      }
      if (attackAreaRef.current) {
        scene.remove(attackAreaRef.current);
        attackAreaRef.current = null;
      }
    };
  }, [scene, isSelected]);

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
        // Move attack area too
        if (attackAreaRef.current) {
          attackAreaRef.current.position.x = current.x;
          attackAreaRef.current.position.z = current.z;
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
        if (attackAreaRef.current) {
          attackAreaRef.current.position.x = current.x;
          attackAreaRef.current.position.z = current.z;
        }
        setMovingTo(null);
      }
    };
    animateMove();
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [movingTo]);

  return attackOptionsPosition ? <AttackOptions position={attackOptionsPosition} onClose={() => { setAttackOptionsPosition(null); dispatch(closeAttackOptions()); }} /> : null;
};

export default Archer; 