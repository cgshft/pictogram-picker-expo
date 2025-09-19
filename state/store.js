import { create } from 'zustand';

export const useDeckStore = create((set, get) => ({ // 👈 Add 'get' here
  // --- State ---
  deckData: [],
  deckName: '',
  currentIndex: 0,
  isLoaded: false,

  // --- Actions ---
  loadDeck: (data, name) => {
    const firstIncompleteIndex = data.findIndex(
      row => !row.symbol_filename
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

  // --- NEW ACTION ---
  selectSymbol: (symbolName, source) => {
    const { deckData, currentIndex, nextWord } = get(); // Get current state and actions
    const currentWord = deckData[currentIndex];

    // Create a sanitized filename, like in the Python app
    const sanitizedWord = (currentWord.english || `entry${currentIndex}`).replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `${sanitizedWord}_${source}_${symbolName}.svg`;

    // Create a new copy of the data array to avoid direct mutation
    const newData = [...deckData];
    // Update the object for the current word
    newData[currentIndex] = {
      ...newData[currentIndex],
      symbol_filename: finalFilename,
      symbol_name: symbolName,
      symbol_source: source,
    };

    // Update the state with the modified data
    set({ deckData: newData });
    
    // Automatically move to the next word
    nextWord();
  },
}));