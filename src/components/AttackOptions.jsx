import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearSelectedCharacter } from '../redux/uiSlice';
import { takeDamage, setDefender } from '../redux/goblinSlice';
import { setAttacker } from '../redux/archerSlice';
import { calculateAttackResult } from '../utils/combat';

const AttackOptions = ({ position, onClose }) => {
  const dispatch = useDispatch();
  const archer = useSelector(state => state.archer);
  const goblin = useSelector(state => state.goblin);

  const handleAttack = () => {
    // Set attacker/defender states
    dispatch(setAttacker(true));  // Set archer as attacker
    dispatch(setDefender(true));  // Set goblin as defender

    // Calculate attack result
    const result = calculateAttackResult(
      {
        attack: typeof archer.attack === 'object' ? archer.attack : { min: archer.attack, max: archer.attack },
        // Add more stats if needed
      },
      goblin
    );

    // Apply damage
    dispatch(takeDamage(result.damage));

    // Show result
    if (result.isCrit) {
      alert(`Critical hit! Damage: ${result.damage}`);
    } else {
      alert(`Hit! Damage: ${result.damage}`);
    }

    // Reset attacker/defender states after a short delay (to allow for animations)
    setTimeout(() => {
      dispatch(setAttacker(false));
      dispatch(setDefender(false));
    }, 1000);

    // Clear selection and close UI
    dispatch(clearSelectedCharacter());
    if (onClose) onClose();
  };

  const handleReturn = () => {
    if (onClose) onClose();
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '10px',
        borderRadius: '5px',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
      }}
    >
      <button onClick={handleAttack}>Attack</button>
      <button onClick={handleReturn}>Return</button>
    </div>
  );
};

export default AttackOptions; 