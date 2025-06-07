import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: 'Archer',
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  profileImage: '/assets/profile/archer.png',
  position: { x: 0, y: 0, z: 0 },
  level: 1,
  experience: 0,
  movement: 7,
  range: 5,
  statusEffects: [],
  isAlive: true,
  hero: true,
  // inventory: [],
  // equipment: {},
};

const archerSlice = createSlice({
  name: 'archer',
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

export const { setHealth, setPosition } = archerSlice.actions;
export default archerSlice.reducer;