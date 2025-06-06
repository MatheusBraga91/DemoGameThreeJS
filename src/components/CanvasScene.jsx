import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { loadAndApplyTexture } from '../utils/textureLoader';

const CanvasScene = () => {
  const mountRef = useRef(null);
  const charactersRef = useRef([]);

  useEffect(() => {
    // 1. Configuração básica da cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(25, 25, 25);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // 2. Chão com grid mais visível
    const floorSize = 50;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(floorSize, floorSize),
      new THREE.MeshStandardMaterial({
        color: 0x2ecc71,
        roughness: 0.8,
        metalness: 0.2
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid helper mais destacado
    const gridHelper = new THREE.GridHelper(floorSize, 20, 0x555555, 0x888888);
    scene.add(gridHelper);

    // 3. Iluminação melhorada
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // 4. Controles da câmera
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 10;
    controls.maxDistance = 50;

    // 5. Carregar e posicionar personagens
    const loader = new FBXLoader();
    const characterPaths = [
      '/assets/models/characters/archer.fbx',
      '/assets/models/characters/warrior.fbx',
      '/assets/models/characters/wizard.fbx'
    ];

    // Posições em unidades do grid (cada quadrado = 2.5 unidades)
    const gridSpacing = floorSize / 20; // 2.5 unidades por quadrado
    const positions = [
      { x: -2 * gridSpacing, z: 0 }, // Archer 2 quadrados à esquerda
      { x: 0, z: 0 },                // Warrior no centro
      { x: 2 * gridSpacing, z: 0 }   // Wizard 2 quadrados à direita
    ];

    characterPaths.forEach((path, index) => {
      loader.load(
        path,
        async (fbx) => {
          // Calcular tamanho do modelo
          const bbox = new THREE.Box3().setFromObject(fbx);
          const size = bbox.getSize(new THREE.Vector3());
          const maxDimension = Math.max(size.x, size.y, size.z);

          // Escala para ocupar ~1 quadrado (2.5 unidades)
          const targetSize = gridSpacing * 0.8; // 80% do quadrado
          const scale = targetSize / maxDimension;
          fbx.scale.set(scale, scale, scale);

          // Centralizar e posicionar
          const center = bbox.getCenter(new THREE.Vector3());
          fbx.position.copy(positions[index]).sub(center.multiplyScalar(scale));
          
          // Ajustar posição Y para colocar no chão
          const bottomY = bbox.min.y * scale;
          fbx.position.y = -bottomY;

          // Configurar sombras e rotação
          fbx.traverse(child => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          fbx.rotation.y = Math.PI;

          // Aplicar textura ao modelo
          const modelName = path.split('/').pop(); // Pega o nome do arquivo
          const texturedModel = await loadAndApplyTexture(fbx, modelName);
          
          scene.add(texturedModel);
          charactersRef.current.push(texturedModel);

          // Atualizar câmera quando todos estiverem carregados
          if (charactersRef.current.length === characterPaths.length) {
            camera.lookAt(0, 0, 0);
          }
        },
        undefined,
        (error) => {
          console.error(`Error loading ${path}:`, error);
        }
      );
    });

    // 6. Handle resize e animation loop
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0
      }}
    />
  );
};

export default CanvasScene;