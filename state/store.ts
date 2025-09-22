import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DECK_STORAGE_KEY = '@CurrentDeckState';

// --- NEW: Hardcoded map for local folder names ---
const FOLDER_NAME_MAP = {
  Sclera: 'sclera-symbols',
  Picom: 'picom-symbols',
  OpenMoji: 'openmoji-618x618-color',
  'Noto Emoji': 'noto-emoji',
  Mulberry: 'mulberry-symbols',
  Bliss: 'bliss-png',
};

// Define a type for a single item in the deck
type DeckItem = {
  english: string;
  [key: string]: any; // Allows other properties from the initial CSV
  symbol_name: string | null;
  symbol_source: string | null;
  symbol_filename: string | null;
  android_path: string | null;
  folder_name: string | null;
  notes: string | null;
};

// Define the shape of the Zustand store's state and actions
type DeckStoreState = {
  deckData: DeckItem[];
  deckName: string;
  currentIndex: number;
  isLoaded: boolean;
  loadDeck: (data: DeckItem[], name: string) => void;
  nextWord: () => void;
  prevWord: () => void;
  selectSymbol: (
    symbolName: string,
    source: string,
    filename: string,
    androidPath: string | null
  ) => void;
  addNote: (noteText: string) => void;
  restoreState: () => Promise<boolean>;
  clearSavedState: () => Promise<void>;
};

export const useDeckStore = create<DeckStoreState>((set, get) => ({
  // --- State ---
  deckData: [],
  deckName: '',
  currentIndex: 0,
  isLoaded: false,

  // --- Actions ---
  loadDeck: (data, name) => {
    const firstIncompleteIndex = data.findIndex(
      (row) => !row.symbol_filename && !row.symbol_name
    );
    set({
      deckData: data,
      deckName: name,
      currentIndex: firstIncompleteIndex === -1 ? 0 : firstIncompleteIndex,
      isLoaded: true,
    });
  },

  nextWord: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.deckData.length - 1),
    })),

  prevWord: () =>
    set((state) => ({
      currentIndex: Math.max(state.currentIndex - 1, 0),
    })),

  // --- UPDATED ACTION TO SELECT A SYMBOL ---
  selectSymbol: (symbolName, source, filename, androidPath) => {
    set((state) => {
      if (state.currentIndex >= 0 && state.currentIndex < state.deckData.length) {
        const newDeckData = [...state.deckData];
        
        // --- LOGIC CHANGE ---
        // Look up the folder name in the map.
        // If it's not found (e.g., for ARASAAC, Flaticon), it will fall back to using the source name itself.
        const folderName = FOLDER_NAME_MAP[source] || source;

        newDeckData[state.currentIndex] = {
          ...newDeckData[state.currentIndex],
          symbol_name: symbolName,
          symbol_source: source,
          folder_name: folderName, // Use the mapped or fallback folder name
          symbol_filename: filename,
          android_path: androidPath || '',
        };

        return { deckData: newDeckData };
      }
      return {};
    });

    get().nextWord();
  },
  
  addNote: (noteText) => {
    set((state) => {
      const newData = [...state.deckData];
      const currentItem = newData[state.currentIndex];
      if (currentItem) {
        newData[state.currentIndex] = { ...currentItem, notes: noteText };
        return { deckData: newData };
      }
      return {};
    });
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

// Subscribe to state changes to automatically save progress
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