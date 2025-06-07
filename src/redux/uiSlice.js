import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedCharacter: null, // e.g., { type: 'archer', id: 1 }
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
  },
});

export const { setSelectedCharacter, clearSelectedCharacter } = uiSlice.actions;
export default uiSlice.reducer; 