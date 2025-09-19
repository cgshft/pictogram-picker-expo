import React, { useMemo, useState, useEffect } from "react"; // 👈 Import useEffect
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import { mulberryData } from "../assets/mulberrySymbols.js";
import SymbolItem from "../components/SymbolItem";

const fuse = new Fuse(mulberryData, {
  keys: ["symbol-en"],
  includeScore: true,
  threshold: 0.4,
});

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);
  const selectSymbol = useDeckStore((state) => state.selectSymbol);

  const screenOptions = useMemo(() => ({ title: deckName }), [deckName]);

  const currentWord = deckData[currentIndex];

  // --- REFACTOR: Create a reusable search function ---
  const performSearch = (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    console.log(`Searching for: "${query}"`);
    const results = fuse.search(query);
    // ⭐️ CHANGE 1: Limit results to the top 4
    setSearchResults(results.slice(0, 4));
  };

  // --- NEW: Use an effect to auto-search when the word changes ---
  useEffect(() => {
    const newWordQuery = deckData[currentIndex]?.english;
    if (newWordQuery) {
      // ⭐️ CHANGE 2: Clear the search input
      setSearchTerm("");
      // ⭐️ CHANGE 3: Automatically perform a search for the new word
      performSearch(newWordQuery);
    }
    // This effect will re-run whenever currentIndex changes
  }, [currentIndex, deckData]);

  // This function is now only for manual searches via the button
  const handleSearch = () => {
    const query = searchTerm.trim() || currentWord?.english || "";
    performSearch(query);
  };

  if (!isLoaded || deckData.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === deckData.length - 1;

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

      <View style={styles.wordContainer}>
        <Text style={styles.statusText}>
          Word {currentIndex + 1} of {deckData.length}
        </Text>
        <Text style={styles.wordText}>{currentWord?.english || "N/A"}</Text>
        <Text style={styles.infoText}>
          Symbol: {currentWord?.symbol_name || "None"}
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Custom Search..."
          placeholderTextColor="#888"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.navButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchResults}
        renderItem={({ item }) => (
          <SymbolItem
            name={item.item["symbol-en"]}
            onPress={() => selectSymbol(item.item["symbol-en"], "Mulberry")}
          />
        )}
        keyExtractor={(item) => item.item["symbol-en"]}
        numColumns={3}
        contentContainerStyle={styles.resultsContainer}
      />

      <View style={styles.navContainer}>
        <TouchableOpacity
          style={[styles.navButton, isAtStart && styles.disabledButton]}
          onPress={prevWord}
          disabled={isAtStart}
        >
          <Text style={styles.navButtonText}>{"<< Prev"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, isAtEnd && styles.disabledButton]}
          onPress={nextWord}
          disabled={isAtEnd}
        >
          <Text style={styles.navButtonText}>{"Next >>"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ... styles are unchanged
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  wordContainer: { width: "100%", alignItems: "center", padding: 10 },
  statusText: { color: "gray", fontSize: 18, marginBottom: 10 },
  wordText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  infoText: { color: "cyan", fontSize: 16, marginTop: 8, fontStyle: "italic" },
  searchContainer: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#333",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: "#555",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  resultsContainer: { alignItems: "center" },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 10,
    borderTopColor: "#333",
    borderTopWidth: 1,
  },
  navButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#444444" },
  navButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
