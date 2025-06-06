import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  monsters: [],
  selectedMonster: null,
};

export const monsterSlice = createSlice({
  name: 'monsters',
  initialState,
  reducers: {
    setMonsters: (state, action) => {
      state.monsters = action.payload;
    },
    setSelectedMonster: (state, action) => {
      state.selectedMonster = action.payload;
    },
  },
});

export const { setMonsters, setSelectedMonster } = monsterSlice.actions;

export default monsterSlice.reducer; 