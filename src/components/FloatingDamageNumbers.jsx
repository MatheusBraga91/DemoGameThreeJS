import React, { useEffect, useState } from 'react';
import * as THREE from 'three';

// numbers: [{ id, value, position3D: { x, y, z }, color }]
const FloatingDamageNumbers = ({ numbers, camera, removeNumber }) => {
  const [screenPositions, setScreenPositions] = useState([]);

  useEffect(() => {
    if (!camera) return;
    // Project all 3D positions to 2D screen positions
    const newScreenPositions = numbers.map(num => {
      const pos = new THREE.Vector3(num.position3D.x, num.position3D.y, num.position3D.z);
      pos.project(camera);
      const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
      return { id: num.id, x, y };
    });
    setScreenPositions(newScreenPositions);
  }, [numbers, camera]);

  useEffect(() => {
    // Remove each number after 1 second
    numbers.forEach(num => {
      const timeout = setTimeout(() => {
        removeNumber(num.id);
      }, 1000);
      return () => clearTimeout(timeout);
    });
  }, [numbers, removeNumber]);

  return (
    <>
      {numbers.map((num, i) => {
        const screen = screenPositions.find(s => s.id === num.id);
        if (!screen) return null;
        return (
          <div
            key={num.id}
            style={{
              position: 'absolute',
              left: `${screen.x}px`,
              top: `${screen.y}px`,
              color: num.color || (num.value > 0 ? 'yellow' : 'white'),
              fontWeight: 'bold',
              fontSize: '2em',
              pointerEvents: 'none',
              textShadow: '0 0 8px black',
              zIndex: 1000,
              userSelect: 'none',
              transition: 'opacity 0.5s',
              opacity: 1,
            }}
          >
            {num.value}
          </div>
        );
      })}
    </>
  );
};

export default FloatingDamageNumbers; 