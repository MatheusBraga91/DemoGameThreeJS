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

    // Criar linhas brancas para o grid
    const gridDivisions = 20; // Mesmo número de divisões que tínhamos antes
    const gridSize = floorSize;
    const gridStep = gridSize / gridDivisions;
    const gridLines = new THREE.Group();

    // Criar linhas horizontais e verticais
    for (let i = 0; i <= gridDivisions; i++) {
      const position = (i * gridStep) - (gridSize / 2);
      
      // Linha horizontal
      const horizontalLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-gridSize/2, 0.01, position),
          new THREE.Vector3(gridSize/2, 0.01, position)
        ]),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      gridLines.add(horizontalLine);

      // Linha vertical
      const verticalLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(position, 0.01, -gridSize/2),
          new THREE.Vector3(position, 0.01, gridSize/2)
        ]),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );
      gridLines.add(verticalLine);
    }

    scene.add(gridLines);

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
    const halfGrid = gridSpacing / 2;   // Metade do tamanho do quadrado (1.25 unidades)
    const positions = [
      { x: -halfGrid, z: halfGrid },                    // Warrior no quadrado central
      { x: -gridSpacing - halfGrid, z: halfGrid },      // Archer no quadrado à esquerda
      { x: -floorSize/2 + halfGrid, z: -floorSize/2 + halfGrid }  // Wizard no canto inferior esquerdo
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

          // Posicionar exatamente no centro do quadrado
          const gridPosition = positions[index];
          fbx.position.set(
            gridPosition.x,
            0,
            gridPosition.z
          );
          
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
          const modelName = path.split('/').pop();
          const texturedModel = await loadAndApplyTexture(fbx, modelName);
          
          // Criar hitbox para o personagem
          const hitboxGeometry = new THREE.BoxGeometry(gridSpacing, gridSpacing, gridSpacing);
          const hitboxMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.5
          });
          const hitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
          
          // Posicionar a hitbox no mesmo lugar do personagem
          hitbox.position.copy(texturedModel.position);
          hitbox.position.y = gridSpacing / 2; // Elevar a hitbox para cobrir o personagem
          
          // Adicionar a hitbox à cena
          scene.add(hitbox);
          
          // Armazenar referências do modelo e sua hitbox
          charactersRef.current[index] = {
            model: texturedModel,
            hitbox: hitbox,
            name: characterNames[index]
          };

          scene.add(texturedModel);

          // Atualizar câmera quando todos estiverem carregados
          if (charactersRef.current.filter(Boolean).length === characterPaths.length) {
            camera.lookAt(0, 0, 0);
          }
        },
        undefined,
        (error) => {
          console.error(`Error loading ${path}:`, error);
        }
      );
    });

    // Adicionar raycaster para detecção de clique e hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const characterNames = ['Warrior', 'Archer', 'Wizard'];
    let selectedCharacter = null;

    // Função para lidar com movimento do mouse
    const onMouseMove = (event) => {
      // Calcular posição do mouse em coordenadas normalizadas (-1 a +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Atualizar o raycaster
      raycaster.setFromCamera(mouse, camera);

      // Verificar interseções com as hitboxes
      const hitboxes = charactersRef.current.map(char => char?.hitbox).filter(Boolean);
      const intersects = raycaster.intersectObjects(hitboxes);

      // Resetar cor de todas as hitboxes
      hitboxes.forEach(hitbox => {
        if (hitbox) {
          hitbox.material.color.set(0xff0000);
          hitbox.material.opacity = 0.5;
        }
      });

      // Destacar hitbox sob o mouse
      if (intersects.length > 0) {
        const hitHitbox = intersects[0].object;
        hitHitbox.material.color.set(0x00ff00);
        hitHitbox.material.opacity = 0.8;
        document.body.style.cursor = 'pointer';
      } else {
        document.body.style.cursor = 'default';
      }
    };

    // Função para lidar com cliques
    const onMouseClick = (event) => {
      // Calcular posição do mouse em coordenadas normalizadas (-1 a +1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Atualizar o raycaster
      raycaster.setFromCamera(mouse, camera);

      // Verificar interseções com as hitboxes
      const hitboxes = charactersRef.current.map(char => char?.hitbox).filter(Boolean);
      const intersects = raycaster.intersectObjects(hitboxes);

      if (intersects.length > 0) {
        const hitHitbox = intersects[0].object;
        
        // Encontrar o índice correto do personagem
        const characterIndex = charactersRef.current.findIndex(
          char => char?.hitbox === hitHitbox
        );
        
        if (characterIndex !== -1) {
          const character = charactersRef.current[characterIndex];
          
          // Resetar seleção anterior
          if (selectedCharacter !== null && charactersRef.current[selectedCharacter]) {
            charactersRef.current[selectedCharacter].hitbox.material.color.set(0xff0000);
          }

          // Atualizar seleção
          selectedCharacter = characterIndex;
          hitHitbox.material.color.set(0x0000ff);
          
          console.log(`Selected: ${character.name}`);
        }
      } else {
        // Resetar seleção se clicar fora
        if (selectedCharacter !== null && charactersRef.current[selectedCharacter]) {
          charactersRef.current[selectedCharacter].hitbox.material.color.set(0xff0000);
          selectedCharacter = null;
        }
      }
    };

    // Adicionar listeners
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);

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

      // Animar o movimento do wizard
      if (charactersRef.current.length > 0 && charactersRef.current[2]?.model) {
        const wizard = charactersRef.current[2].model;
        const wizardHitbox = charactersRef.current[2].hitbox;
        const time = Date.now() * 0.001;
        const cycleDuration = 20;
        const cycleProgress = (time % cycleDuration) / cycleDuration;

        // Definir as posições do movimento ao longo das bordas
        const positions = [
          { x: -floorSize/2 + halfGrid, z: -floorSize/2 + halfGrid },
          { x: floorSize/2 - halfGrid, z: -floorSize/2 + halfGrid },
          { x: floorSize/2 - halfGrid, z: floorSize/2 - halfGrid },
          { x: -floorSize/2 + halfGrid, z: floorSize/2 - halfGrid },
          { x: -floorSize/2 + halfGrid, z: -floorSize/2 + halfGrid }
        ];

        const segment = Math.floor(cycleProgress * 4);
        const segmentProgress = (cycleProgress * 4) % 1;
        
        const startPos = positions[segment];
        const endPos = positions[(segment + 1) % 5];
        
        // Atualizar posição do modelo e da hitbox
        wizard.position.x = startPos.x + (endPos.x - startPos.x) * segmentProgress;
        wizard.position.z = startPos.z + (endPos.z - startPos.z) * segmentProgress;
        wizardHitbox.position.copy(wizard.position);
        wizardHitbox.position.y = gridSpacing / 2;

        const angle = Math.atan2(endPos.x - startPos.x, endPos.z - startPos.z);
        wizard.rotation.y = angle;
        wizardHitbox.rotation.y = angle;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onMouseClick);
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