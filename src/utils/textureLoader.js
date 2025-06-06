import * as THREE from 'three';

// Mapeamento de modelos para suas texturas
const modelTextureMap = {
  'archer.fbx': {
    diffuse: 'archer/texture_diffuse.png',
    normal: 'archer/texture_normal.png',
    metallic: 'archer/texture_metallic.png',
    roughness: 'archer/texture_roughness.png',
    pbr: 'archer/texture_pbr.png'
  },
  'warrior.fbx': {
    diffuse: 'warrior/texture_diffuse.png',
    normal: 'warrior/texture_normal.png',
    metallic: 'warrior/texture_metallic.png',
    roughness: 'warrior/texture_roughness.png',
    pbr: 'warrior/texture_pbr.png'
  },
  'wizard.fbx': {
    diffuse: 'wizard/texture_diffuse.png',
    normal: 'wizard/texture_normal.png',
    metallic: 'wizard/texture_metallic.png',
    roughness: 'wizard/texture_roughness.png',
    pbr: 'wizard/texture_pbr.png'
  }
};

/**
 * Configura uma textura com as propriedades corretas
 * @param {THREE.Texture} texture - A textura a ser configurada
 * @param {number} scale - Fator de escala do modelo
 * @returns {THREE.Texture} - A textura configurada
 */
const configureTexture = (texture, scale) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  
  // Ajustar a repetição da textura baseado na escala
  const repeat = 1 / scale;
  texture.repeat.set(repeat, repeat);
  
  texture.offset.set(0, 0);
  texture.rotation = 0;
  texture.center.set(0.5, 0.5);
  return texture;
};

/**
 * Aplica textura a um modelo FBX
 * @param {THREE.Object3D} model - O modelo FBX carregado
 * @param {string} modelName - Nome do arquivo do modelo (ex: 'archer.fbx')
 * @returns {Promise} - Promise que resolve quando a textura é aplicada
 */
export const applyTextureToModel = (model, modelName) => {
  return new Promise((resolve, reject) => {
    const textureMaps = modelTextureMap[modelName];
    if (!textureMaps) {
      console.warn(`No texture mapping found for model: ${modelName}`);
      resolve(model);
      return;
    }

    console.log(`Loading textures for ${modelName}...`);

    // Calcular a escala do modelo
    const bbox = new THREE.Box3().setFromObject(model);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = model.scale.x; // Assumindo que a escala é uniforme (x = y = z)
    
    console.log(`Model scale factor: ${scale}`);

    const textureLoader = new THREE.TextureLoader();
    const loadTexture = (path) => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          `/assets/textures/${path}`,
          (texture) => {
            console.log(`Loaded texture: ${path}`);
            resolve(configureTexture(texture, scale));
          },
          undefined,
          (error) => {
            console.error(`Error loading texture ${path}:`, error);
            reject(error);
          }
        );
      });
    };

    // Carregar todas as texturas
    Promise.all([
      loadTexture(textureMaps.diffuse),
      loadTexture(textureMaps.normal),
      loadTexture(textureMaps.metallic),
      loadTexture(textureMaps.roughness),
      loadTexture(textureMaps.pbr)
    ])
      .then(([diffuseMap, normalMap, metallicMap, roughnessMap, pbrMap]) => {
        console.log('All textures loaded, applying to model...');
        
        // Aplicar as texturas a todos os meshes do modelo
        model.traverse((child) => {
          if (child.isMesh) {
            console.log(`Applying textures to mesh: ${child.name}`);
            
            // Criar novo material PBR
            const material = new THREE.MeshStandardMaterial({
              map: diffuseMap,          // Textura de cor base
              normalMap: normalMap,     // Mapa de normais para detalhes de superfície
              metalnessMap: metallicMap, // Mapa de metalicidade
              roughnessMap: roughnessMap, // Mapa de rugosidade
              aoMap: pbrMap,            // Mapa de oclusão ambiente
              aoMapIntensity: 1.0,      // Intensidade da oclusão ambiente
              normalScale: new THREE.Vector2(1, 1), // Escala do mapa de normais
              roughness: 1.0,           // Rugosidade base
              metalness: 1.0,           // Metalicidade base
            });

            // Configurar o material
            material.needsUpdate = true;
            child.material = material;

            // Log das propriedades do material para debug
            console.log('Material properties:', {
              hasDiffuseMap: !!material.map,
              hasNormalMap: !!material.normalMap,
              hasMetallicMap: !!material.metalnessMap,
              hasRoughnessMap: !!material.roughnessMap,
              hasAoMap: !!material.aoMap,
              textureRepeat: material.map.repeat
            });
          }
        });

        console.log('Textures applied successfully');
        resolve(model);
      })
      .catch((error) => {
        console.error(`Error loading textures for ${modelName}:`, error);
        reject(error);
      });
  });
};

/**
 * Carrega e aplica textura a um modelo FBX
 * @param {THREE.Object3D} model - O modelo FBX carregado
 * @param {string} modelName - Nome do arquivo do modelo
 * @returns {Promise} - Promise que resolve com o modelo texturizado
 */
export const loadAndApplyTexture = async (model, modelName) => {
  try {
    const texturedModel = await applyTextureToModel(model, modelName);
    return texturedModel;
  } catch (error) {
    console.error(`Failed to apply texture to ${modelName}:`, error);
    return model; // Retorna o modelo original em caso de erro
  }
}; 