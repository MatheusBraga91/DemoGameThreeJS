import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './playerSlice';
import monsterReducer from './monsterSlice';

export const store = configureStore({
  reducer: {
    player: playerReducer,
    monsters: monsterReducer,
  },
}); 