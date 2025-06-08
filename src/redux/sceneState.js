import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  characterSelected: false
};

const sceneStateSlice = createSlice({
  name: 'sceneState',
  initialState,
  reducers: {
    setCharacterSelected: (state, action) => {
      const previousState = state.characterSelected;
      state.characterSelected = action.payload;
      console.log('SceneState - Character Selection Changed:');
      console.log('Previous State:', previousState);
      console.log('New State:', action.payload);
      console.log('------------------------');
    }
  }
});

export const { setCharacterSelected } = sceneStateSlice.actions;
export default sceneStateSlice.reducer; 