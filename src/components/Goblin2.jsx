import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedCharacter, clearSelectedCharacter } from '../redux/uiSlice';
import { setIsInAttackRange, setSelected } from '../redux/goblinSlice';
import { setCharacterSelected } from '../redux/sceneState';

const Goblin = ({ scene, position, camera }) => {
  const dispatch = useDispatch();
  const selectedCharacter = useSelector(state => state.ui.selectedCharacter);
  const isCharacterSelected = useSelector(state => state.sceneState.characterSelected);
  const isSelected = useSelector(state =>
    state.ui.selectedCharacter?.type === 'goblin' &&
    state.ui.selectedCharacter?.id === 1 &&
    state.goblin.selected
  );
  const isInAttackRange = useSelector(state => state.goblin.isInAttackRange);
  const isInMovementRange = useSelector(state => state.goblin.isInMovementRange);
  const attackOptionsOpen = useSelector(state => state.ui.attackOptionsOpen);

  const modelRef = useRef();
  const hitboxRef = useRef();
  const cubeRef = useRef(); // Adicionado como fallback
  const movementRadiusRef = useRef();
  const visionConeRef = useRef();

  const gridSquareSize = 1;
  const movementRadius = 7;
  const visionRange = 7;
  const visionAngle = Math.PI / 2;

  // Load model - Corrigido para seguir o mesmo padrão do Archer
  useEffect(() => {
    if (!scene) return;

    console.log('Goblin: Loading model...');
    const loader = new FBXLoader();

    // Remove modelos anteriores antes de carregar novo
    if (modelRef.current) scene.remove(modelRef.current);
    if (hitboxRef.current) scene.remove(hitboxRef.current);
    if (cubeRef.current) scene.remove(cubeRef.current);

    loader.load(
      '/assets/models/monsters/goblin.fbx',
      (fbx) => {
        console.log('Goblin: Model loaded successfully');
        // Scale and position
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

        // Hitbox
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
        console.error('Goblin: Error loading model:', error);
        // Fallback cube como no Archer
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        cube.position.set(position.x, 0.5, position.z);
        cubeRef.current = cube;
        scene.add(cube);
      }
    );

    // Timeout para fallback como no Archer
    setTimeout(() => {
      if (!modelRef.current && !cubeRef.current) {
        console.log('Goblin: Adding fallback cube after timeout');
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1, 1),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
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
      if (visionConeRef.current) scene.remove(visionConeRef.current);
    };
  }, [scene, position, camera]); // Adicionado camera nas dependências

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
      if (attackOptionsOpen) return; // Block all scene clicks if UI is open
      if (!hitboxRef.current) return;
      if (!scene || !camera) return;
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      // Verifique todos os objetos clicados
      const intersects = raycaster.intersectObjects(scene.children, true);

      // 1. Verifique hitbox primeiro
      const hitboxIntersects = raycaster.intersectObject(hitboxRef.current);
      if (hitboxIntersects.length > 0) {
        // If clicking on goblin
        if (isCharacterSelected) {
          console.log('Cannot select goblin: a character is already selected');
          return;
        }

        if (isSelected) {
          console.log('Deselecting goblin');
          dispatch(clearSelectedCharacter());
          dispatch(setSelected(false));
          dispatch(setCharacterSelected(false));
        } else {
          // Check if any character is already selected
          if (selectedCharacter) {
            console.log('Cannot select goblin: another character is already selected');
            return;
          }
          console.log('Selecting goblin');
          dispatch(setSelectedCharacter({ type: 'goblin', id: 1 }));
          dispatch(setSelected(true));
          dispatch(setCharacterSelected(true));
        }
        return;
      }

      // 2. If clicking anywhere else and goblin is selected, deselect it
      if (isSelected) {
        console.log('Deselecting goblin - clicked outside');
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
  }, [scene, camera, isSelected, dispatch, isInMovementRange, isInAttackRange, attackOptionsOpen, isCharacterSelected]); // Added isCharacterSelected to dependencies

  useEffect(() => {
    if (!scene || !modelRef.current) return;

    // Limpeza prévia
    if (movementRadiusRef.current) scene.remove(movementRadiusRef.current);
    if (visionConeRef.current) scene.remove(visionConeRef.current);

    if (isSelected) {
      console.log('Showing goblin selection visuals');

      // Movement radius
      const geometry = new THREE.RingGeometry(movementRadius - 0.1, movementRadius, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthTest: false // Importante para renderizar sobre outros objetos
      });

      const circle = new THREE.Mesh(geometry, material);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(
        modelRef.current.position.x,
        0.01,
        modelRef.current.position.z
      );
      movementRadiusRef.current = circle;
      scene.add(circle);

      // Vision cone
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
      visionCone.position.set(
        modelRef.current.position.x,
        0.012,
        modelRef.current.position.z
      );
      visionCone.rotation.x = -Math.PI / 2;
      visionCone.rotation.z = -Math.PI / 2;
      visionConeRef.current = visionCone;
      scene.add(visionCone);
    }
  }, [scene, isSelected, modelRef.current?.position]); // Adicione position como dependência

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

  return null;
};

export default Goblin; 