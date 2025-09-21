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

  selectSymbol: (symbolName, source, customFilename = null) => {
    const { deckData, currentIndex, nextWord } = get();
    const currentWord = deckData[currentIndex];

    let finalFilename = customFilename;
    if (!finalFilename) {
      const sanitizedWord = (currentWord.english || `entry${currentIndex}`).replace(/[^a-zA-Z0-9]/g, '_');
      const extension = source === "Mulberry" ? 'png' : 'svg';
      finalFilename = `${sanitizedWord}_${source}_${symbolName}.${extension}`;
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
  
  // **NEW ACTION TO ADD A NOTE**
  addNote: (noteText) => {
    const { deckData, currentIndex } = get();
    const newData = [...deckData];
    
    // Ensure the 'notes' property exists on the current object
    if (newData[currentIndex]) {
        newData[currentIndex].notes = noteText;
        set({ deckData: newData });
        console.log(`Note added for index ${currentIndex}: ${noteText}`);
    }
  },
  
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
        return true;
      }
    } catch (e) {
      console.error("Failed to restore deck state.", e);
    }
    return false;
  },

  clearSavedState: async () => {
    try {
      await AsyncStorage.removeItem(DECK_STORAGE_KEY);
      console.log("Cleared saved deck state.");
    } catch (e) {
      console.error("Failed to clear saved deck state.", e);
    }
  }
}));

// Subscribe to state changes for persistence
useDeckStore.subscribe(
  (state) => {
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