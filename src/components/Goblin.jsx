import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedCharacter, clearSelectedCharacter, openAttackOptions, closeAttackOptions } from '../redux/uiSlice';
import { setIsInAttackRange, setSelected } from '../redux/goblinSlice';
import AttackOptions from './AttackOptions';
import { setCharacterSelected } from '../redux/sceneState';

console.log('Goblin.jsx file loaded');

const Goblin = ({ scene, camera, position }) => {
  const dispatch = useDispatch();
  const selectedCharacter = useSelector(state => state.ui.selectedCharacter);
  const isSelected = useSelector(state => state.goblin.selected);
  const attackOptionsOpen = useSelector(state => state.ui.attackOptionsOpen);
  const isCharacterSelected = useSelector(state => state.sceneState.characterSelected);
  const modelRef = useRef();
  const hitboxRef = useRef();
  const cubeRef = useRef();
  const movementRadiusRef = useRef();
  const attackAreaRef = useRef();
  const visionConeRef = useRef();
  const [movingTo, setMovingTo] = useState(null);
  const [attackOptionsPosition, setAttackOptionsPosition] = useState(null);
  const isInAttackRange = useSelector(state => state.goblin.isInAttackRange);
  const isInMovementRange = useSelector(state => state.goblin.isInMovementRange);

  // For a 20x20 grid, each square is 1 unit
  const gridSquareSize = 1;
  const movementRadius = 7; // Goblin tem menor raio de movimento
  const attackRange = 3; // Goblin tem menor alcance de ataque
  const movementSpeed = 0.02; // Goblin é mais lento

  // Only load the model and hitbox once (when scene/camera/position changes)
  useEffect(() => {
    if (!scene) {
      console.log('Goblin: No scene provided');
      return;
    }
    console.log('Goblin: useEffect running, attempting to load FBX...');
    const loader = new FBXLoader();
    loader.load(
      '/assets/models/monsters/goblin.fbx',
      (fbx) => {
        console.log('Goblin: FBX loaded', fbx);
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
        console.error('Goblin: Error loading goblin model:', error);
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
        console.log('Goblin: FBX did not load after 3 seconds, adding fallback cube');
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
      if (visionConeRef.current) scene.remove(visionConeRef.current);
    };
  }, [scene, camera, position]);

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

      // Create attack area (small red circle for melee range)
      const attackGeometry = new THREE.CircleGeometry(attackRange, 64);
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

      // Add vision cone
      const visionRange = 7;
      const visionAngle = Math.PI / 2;
      const segments = 64;
      const visionGeometry = new THREE.CircleGeometry(
        visionRange,
        segments,
        -visionAngle / 2,
        visionAngle
      );
      const visionMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const visionCone = new THREE.Mesh(visionGeometry, visionMaterial);
      visionCone.position.set(modelRef.current.position.x, 0.03, modelRef.current.position.z);
      visionCone.rotation.x = -Math.PI / 2;
      visionCone.rotation.z = -Math.PI / 2;
      visionConeRef.current = visionCone;
      scene.add(visionCone);
    } else {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
      }
      if (attackAreaRef.current) {
        scene.remove(attackAreaRef.current);
        attackAreaRef.current = null;
      }
      if (visionConeRef.current) {
        scene.remove(visionConeRef.current);
        visionConeRef.current = null;
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
      if (visionConeRef.current) {
        scene.remove(visionConeRef.current);
        visionConeRef.current = null;
      }
    };
  }, [scene, isSelected]);

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
      if (!hitboxRef.current) return;
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
          // If clicking on goblin
          if (isCharacterSelected) {
            console.log('Cannot select goblin: a character is already selected');
            return;
          }

          if (isSelected) {
            // Clicked hitbox while selected - deselect
            console.log('Deselecting goblin: clicked on hitbox while selected');
            dispatch(clearSelectedCharacter());
            dispatch(setSelected(false));
            dispatch(setCharacterSelected(false));
          } else {
            // Check if any character is already selected
            if (selectedCharacter) {
              console.log('Cannot select goblin: another character is already selected');
              return;
            }
            // Clicked hitbox while not selected - select
            console.log('Selecting goblin: clicked on hitbox while not selected');
            dispatch(setSelectedCharacter({ type: 'goblin', id: 1 }));
            dispatch(setSelected(true));
            dispatch(setCharacterSelected(true));
          }
          return;
        }
      }

      // 2. If goblin is selected, handle archer click for attack
      if (isSelected) {

        // Find archer mesh (green box)
        const archerIntersect = intersects.find(intersect =>
          intersect.object.isMesh &&
          intersect.object.geometry &&
          intersect.object.geometry.type === 'BoxGeometry' &&
          intersect.object.material.color.getHex() === 0x00ff00
        );
        if (archerIntersect && modelRef.current) {
          const archerPosition = archerIntersect.object.position;
          const goblinPosition = modelRef.current.position;
          const dist = Math.sqrt(
            Math.pow(goblinPosition.x - archerPosition.x, 2) +
            Math.pow(goblinPosition.z - archerPosition.z, 2)
          );
          const inMove = dist <= movementRadius;
          const inAttack = dist <= attackRange; // Changed to check if within attack range
          console.log('Goblin click on archer:', { dist, movementRadius, attackRange, inMove, inAttack });

          // If in attack range, show attack options
          if (inAttack) {
            console.log('Showing attack options UI');
            setAttackOptionsPosition({ x: event.clientX, y: event.clientY });
            dispatch(openAttackOptions());
            return;
          }

          // If in movement range but not attack range, move towards archer
          if (inMove && !inAttack) {
            console.log('Moving goblin towards archer');
            setMovingTo({ x: archerPosition.x, z: archerPosition.z });
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
            console.log('Moving goblin: clicked inside movement radius');
            setMovingTo({ x: point.x, z: point.z });
            return;
          }
        }
        // If not archer in attack range or movement, deselect
        console.log('Deselecting goblin: clicked outside movement and attack radius');
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

  }
    , [scene, camera, isSelected, dispatch, isInMovementRange, isInAttackRange, attackOptionsOpen, isCharacterSelected]);

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
        // Move vision cone too
        if (visionConeRef.current) {
          visionConeRef.current.position.x = current.x;
          visionConeRef.current.position.z = current.z;
          visionConeRef.current.rotation.z = model.rotation.y - Math.PI / 2;
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
        if (visionConeRef.current) {
          visionConeRef.current.position.x = current.x;
          visionConeRef.current.position.z = current.z;
          visionConeRef.current.rotation.z = model.rotation.y - Math.PI / 2;
        }
        setMovingTo(null);
      }
    };
    animateMove();
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [movingTo]);

  // Check if goblin is within attack range of archer
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    const archer = scene.children.find(obj => obj.isMesh && obj.geometry && obj.geometry.type === 'BoxGeometry' && obj.material.color.getHex() === 0x00ff00);
    if (archer) {
      const archerPosition = archer.position;
      const goblinPosition = modelRef.current.position;
      const dist = Math.sqrt(
        Math.pow(archerPosition.x - goblinPosition.x, 2) +
        Math.pow(archerPosition.z - goblinPosition.z, 2)
      );
      const attackRange = 8; // Attack range of archer
      dispatch(setIsInAttackRange(dist <= attackRange));
    }
  }, [scene, dispatch]);

  return attackOptionsPosition ? <AttackOptions position={attackOptionsPosition} onClose={() => { setAttackOptionsPosition(null); dispatch(closeAttackOptions()); }} /> : null;
};


export default Goblin;