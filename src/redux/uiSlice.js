import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedCharacter: null, // e.g., { type: 'archer', id: 1 }
  attackOptionsOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedCharacter(state, action) {
      state.selectedCharacter = action.payload;
    },
    clearSelectedCharacter(state) {
      state.selectedCharacter = null;
    },
    openAttackOptions(state) {
      state.attackOptionsOpen = true;
    },
    closeAttackOptions(state) {
      state.attackOptionsOpen = false;
    },
  },
});

export const { setSelectedCharacter, clearSelectedCharacter, openAttackOptions, closeAttackOptions } = uiSlice.actions;
export default uiSlice.reducer; 