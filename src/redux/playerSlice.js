import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  health: 100,
};

export const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPosition: (state, action) => {
      state.position = action.payload;
    },
    setRotation: (state, action) => {
      state.rotation = action.payload;
    },
    setHealth: (state, action) => {
      state.health = action.payload;
    },
  },
});

export const { setPosition, setRotation, setHealth } = playerSlice.actions;

export default playerSlice.reducer; 