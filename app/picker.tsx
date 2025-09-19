import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
} from "react-native"; // 👈 Change ScrollView to FlatList
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import { mulberryData } from "../assets/mulberrySymbols.js";
import SymbolItem from "../components/SymbolItem"; // 👈 Import our new component

const fuse = new Fuse(mulberryData, {
  keys: ["symbol-en"],
  includeScore: true,
  threshold: 0.4,
});

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // ... (state selection and other hooks are unchanged)
  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);

  const screenOptions = useMemo(() => ({ title: deckName }), [deckName]);

  const currentWord = deckData[currentIndex];

  const handleSearch = () => {
    const query = searchTerm.trim() || currentWord?.english || "";
    if (!query) return;

    console.log(`Searching for: "${query}"`);
    const results = fuse.search(query);
    setSearchResults(results); // Keep all results for FlatList
  };

  if (!isLoaded || deckData.length === 0) {
    // ... loading indicator is unchanged
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
      {/* ... Word display and Search UI are unchanged ... */}
      <Stack.Screen options={screenOptions} />

      <View style={styles.wordContainer}>
        <Text style={styles.statusText}>
          Word {currentIndex + 1} of {deckData.length}
        </Text>
        <Text style={styles.wordText}>{currentWord?.english || "N/A"}</Text>
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

      {/* --- USE FLATLIST TO DISPLAY SYMBOL ITEMS --- */}
      <FlatList
        data={searchResults}
        renderItem={({ item }) => <SymbolItem name={item.item["symbol-en"]} />}
        keyExtractor={(item) => item.item["symbol-en"]}
        numColumns={3} // Display in a grid
        contentContainerStyle={styles.resultsContainer}
      />

      <View style={styles.navContainer}>
        {/* ... Nav buttons are unchanged ... */}
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

const styles = StyleSheet.create({
  // ... most styles are unchanged ...
  container: { flex: 1, padding: 10 },
  wordContainer: { width: "100%", alignItems: "center", padding: 10 },
  statusText: { color: "gray", fontSize: 18, marginBottom: 10 },
  wordText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
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
  // Changed resultsContainer to be a contentContainerStyle for FlatList
  resultsContainer: {
    alignItems: "center",
  },
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