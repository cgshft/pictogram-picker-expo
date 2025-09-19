import { create } from 'zustand';

// This is our global store. Any component can access and update this data.
export const useDeckStore = create((set) => ({
  // --- State ---
  deckData: [],        // The array of words/rows from the CSV
  deckName: '',        // The name of the current deck
  currentIndex: 0,     // The index of the current word we are working on
  isLoaded: false,     // A flag to check if data is ready

  // --- Actions ---
  // An action to load a new deck into the state
  loadDeck: (data, name) => {
    // In Python, you checked for a first incomplete row. We'll do the same.
    const firstIncompleteIndex = data.findIndex(
      row => !row.symbol_filename
    );

    set({
      deckData: data,
      deckName: name,
      // Start at the first incomplete row, or the beginning if all are done/new
      currentIndex: firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex,
      isLoaded: true,
    });
  },

  // An action to go to the next word
  nextWord: () => set((state) => ({
    currentIndex: Math.min(state.currentIndex + 1, state.deckData.length - 1),
  })),

  // An action to go to the previous word
  prevWord: () => set((state) => ({
    currentIndex: Math.max(state.currentIndex - 1, 0),
  })),

  // You can add more actions here later, like for saving data
}));