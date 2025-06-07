import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedCharacter, clearSelectedCharacter } from '../redux/uiSlice';

const Goblin = ({ scene, position, camera }) => {
  const dispatch = useDispatch();
  const selectedCharacter = useSelector(state => state.ui.selectedCharacter);
  const isSelected = selectedCharacter && selectedCharacter.type === 'goblin' && selectedCharacter.id === 1;
  const modelRef = useRef();
  const hitboxRef = useRef();
  const movementRadiusRef = useRef();
  const visionConeRef = useRef();
  const gridSquareSize = 1; // For a 20x20 grid, each square is 1 unit
  const movementRadius = 7;
  const visionRange = 6;
  const visionAngle = Math.PI / 2; // 90 degrees

  useEffect(() => {
    if (!scene) return;
    const loader = new FBXLoader();
    loader.load(
      '/assets/models/monsters/goblin.fbx',
      (fbx) => {
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
        modelRef.current = fbx;
        scene.add(fbx);

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
        console.error('Error loading goblin model:', error);
      }
    );
    return () => {
      if (modelRef.current) scene.remove(modelRef.current);
      if (hitboxRef.current) scene.remove(hitboxRef.current);
      if (movementRadiusRef.current) scene.remove(movementRadiusRef.current);
      if (visionConeRef.current) scene.remove(visionConeRef.current);
    };
  }, [scene, position]);

  // Hover and selection logic for hitbox
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
      if (!hitboxRef.current) return;
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObject(hitboxRef.current);
      if (intersects.length > 0) {
        dispatch(setSelectedCharacter({ type: 'goblin', id: 1 }));
      } else {
        dispatch(clearSelectedCharacter());
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [scene, camera, isSelected, dispatch]);

  // Show/hide movement radius and vision cone when selected
  useEffect(() => {
    if (!scene || !modelRef.current) return;
    // Movement radius
    if (isSelected) {
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

      // Create vision cone (sector)
      const segments = 64;
      const thetaStart = -visionAngle / 2;
      const thetaLength = visionAngle;
      const visionGeometry = new THREE.CircleGeometry(visionRange, segments, thetaStart, thetaLength);
      // Remove center vertex to make it a sector (not a full circle)
      // (CircleGeometry includes the center vertex, so we need to set alphaTest or use transparent material)
      const visionMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const visionCone = new THREE.Mesh(visionGeometry, visionMaterial);
      visionCone.position.set(modelRef.current.position.x, 0.012, modelRef.current.position.z);
      visionCone.rotation.x = -Math.PI / 2;
      visionCone.rotation.z = -Math.PI / 2;
      visionConeRef.current = visionCone;
      scene.add(visionCone);
    } else {
      if (movementRadiusRef.current) {
        scene.remove(movementRadiusRef.current);
        movementRadiusRef.current = null;
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
      if (visionConeRef.current) {
        scene.remove(visionConeRef.current);
        visionConeRef.current = null;
      }
    };
  }, [scene, isSelected]);

  return null;
};

export default Goblin; 