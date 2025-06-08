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
  selected: false,
  isAttacker: false,
  isDefender: false,
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
    setSelected(state, action) {
      state.selected = action.payload;
    },
    setAttacker(state, action) {
      state.isAttacker = action.payload;
      state.isDefender = !action.payload;
    },
    setDefender(state, action) {
      state.isDefender = action.payload;
      state.isAttacker = !action.payload;
    },
    // Add more reducers as needed
  },
});

export const { setHealth, setPosition, setSelected, setAttacker, setDefender } = archerSlice.actions;
export default archerSlice.reducer;