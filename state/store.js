// state/store.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing the deck state in AsyncStorage
const DECK_STORAGE_KEY = '@CurrentDeckState';

export const useDeckStore = create((set, get) => ({
  // --- State ---
  deckData: [],
  deckName: '',
  currentIndex: 0,
  isLoaded: false,

  // --- Actions ---
  loadDeck: (data, name) => {
    const firstIncompleteIndex = data.findIndex(
      row => !row.symbol_filename && !row.symbol_name
    );
    set({
      deckData: data,
      deckName: name,
      currentIndex: firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex,
      isLoaded: true,
    });
  },

  nextWord: () => set((state) => ({
    currentIndex: Math.min(state.currentIndex + 1, state.deckData.length - 1),
  })),

  prevWord: () => set((state) => ({
    currentIndex: Math.max(state.currentIndex - 1, 0),
  })),

  selectSymbol: (symbolName, source, customFilename = null) => { // Add customFilename param
    const { deckData, currentIndex, nextWord } = get();
    const currentWord = deckData[currentIndex];

    // --- MODIFIED --- Use the custom filename if provided
    let finalFilename = customFilename;
    if (!finalFilename) {
      const sanitizedWord = (currentWord.english || `entry${currentIndex}`).replace(/[^a-zA-Z0-9]/g, '_');
      // Fallback for original behavior (e.g. Mulberry symbols)
      finalFilename = `${sanitizedWord}_${source}_${symbolName}.svg`;
    }

    const newData = [...deckData];
    newData[currentIndex] = {
      ...newData[currentIndex],
      symbol_filename: finalFilename,
      symbol_name: symbolName,
      symbol_source: source,
    };
    
    set({ deckData: newData });
    nextWord();
  },
  
  // New action to restore state from AsyncStorage
  restoreState: async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(DECK_STORAGE_KEY);
      if (jsonValue != null) {
        const savedState = JSON.parse(jsonValue);
        set({
          deckData: savedState.deckData || [],
          deckName: savedState.deckName || '',
          currentIndex: savedState.currentIndex || 0,
          isLoaded: true,
        });
        return true; // Indicate success
      }
    } catch (e) {
      console.error("Failed to restore deck state.", e);
    }
    return false; // Indicate failure or no saved state
  },

  // New action to clear the saved state
  clearSavedState: async () => {
    try {
      await AsyncStorage.removeItem(DECK_STORAGE_KEY);
      console.log("Cleared saved deck state.");
    } catch (e) {
      console.error("Failed to clear saved deck state.", e);
    }
  }
}));

// --- Subscribe to state changes for persistence ---
// This runs whenever the state changes and saves the relevant parts.
useDeckStore.subscribe(
  (state) => {
    // We only save if a deck is actually loaded to avoid saving empty/initial state.
    if (state.isLoaded && state.deckData.length > 0) {
      const stateToSave = {
        deckData: state.deckData,
        deckName: state.deckName,
        currentIndex: state.currentIndex,
      };
      AsyncStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(stateToSave))
        .catch(e => console.error("Failed to save deck progress.", e));
    }
  }
);