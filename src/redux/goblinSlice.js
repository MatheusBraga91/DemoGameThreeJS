import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: 'Goblin',
  health: 50,
  maxHealth: 50,
  attack: 5,
  defense: 2,
  profileImage: '/assets/profile/goblin.png',
  position: { x: 4, y: 0, z: 4 },
  level: 1,
  experience: 0,
  movement: 5,
  range: 2,
  statusEffects: [],
  isAlive: true,
  hero: false,
  isInAttackRange: false,
  isInMovementRange: false,
  isAttacker: false,
  isDefender: false,
  selected: false,
  // inventory: [],
  // equipment: {},
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
    setSelected(state, action) {
      state.selected = action.payload;
    },
    setIsInAttackRange(state, action) {
      state.isInAttackRange = action.payload;
    },
    setIsInMovementRange(state, action) {
      state.isInMovementRange = action.payload;
    },
    setAttacker(state, action) {
      state.isAttacker = action.payload;
      state.isDefender = !action.payload;
    },
    setDefender(state, action) {
      state.isDefender = action.payload;
      state.isAttacker = !action.payload;
    },
    takeDamage: (state, action) => {
      state.health = Math.max(0, state.health - action.payload);
    },
    // Add more reducers as needed
  },
});

export const {
  setHealth,
  setPosition,
  setIsInAttackRange,
  setIsInMovementRange,
  setAttacker,
  setDefender,
  takeDamage,
  setSelected
} = goblinSlice.actions;
export default goblinSlice.reducer;