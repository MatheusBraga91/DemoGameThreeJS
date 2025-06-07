import { configureStore } from '@reduxjs/toolkit';
import playerReducer from './playerSlice';
import monsterReducer from './monsterSlice';
import archerReducer from './archerSlice';
import goblinReducer from './goblinSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    player: playerReducer,
    monsters: monsterReducer,
    archer: archerReducer,
    goblin: goblinReducer,
    ui: uiReducer,
  },
}); 