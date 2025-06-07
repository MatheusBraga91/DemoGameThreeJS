import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: 'Goblin',
  health: 40,
  maxHealth: 40,
  attack: 6,
  defense: 2,
  profileImage: '/assets/profile/goblin.png',
  position: { x: 10, y: 0, z: 10 },
  level: 1,
  isAlive: true,
  movement: 5,
  range: 1,
  statusEffects: [],
  aiType: 'aggressive',
  experienceReward: 15,
  loot: [],
  hero: false,
};

const goblinSlice = createSlice({
  name: 'goblin',
  initialState,
  reducers: {
    setHealth(state, action) {
      state.health = action.payload;
    },
    setPosition(state, action) {
      state.position = action.payload;
    },
    // Add more reducers as needed
  },
});

export const { setHealth, setPosition } = goblinSlice.actions;
export default goblinSlice.reducer;