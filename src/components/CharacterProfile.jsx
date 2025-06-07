import React from 'react';
import { useSelector } from 'react-redux';
import './CharacterProfile.css';

const CharacterProfile = () => {
  const selected = useSelector(state => state.ui.selectedCharacter);
  const archer = useSelector(state => state.archer);
  const goblin = useSelector(state => state.goblin);
  // Add more as you add more characters

  if (!selected) return null;

  let characterData = null;
  if (selected.type === 'archer') characterData = archer;
  if (selected.type === 'goblin') characterData = goblin;
  // Add more as needed

  if (!characterData) return null;

  return (
    <div className="character-profile-ui">
      <img src={characterData.profileImage} alt={characterData.name} className="profile-img" />
      <div className="profile-info">
        <h2>{characterData.name}</h2>
        <div className="health-bar">
          <span>Health: {characterData.health}/{characterData.maxHealth}</span>
          <div className="bar-bg">
            <div
              className="bar-fill"
              style={{ width: `${(characterData.health / characterData.maxHealth) * 100}%` }}
            />
          </div>
        </div>
        {characterData.hero && (
          <button className="inventory-btn">Inventory</button>
        )}
      </div>
    </div>
  );
};

export default CharacterProfile; 