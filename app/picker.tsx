import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native"; // 👈 Import ScrollView
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js"; // 👈 Import Fuse.js
import { mulberryData } from "../assets/mulberrySymbols.js"; // 👈 Import our new symbol data

// --- SETUP FUSE.JS ---
// Configure Fuse.js to search the 'symbol-en' key in our data.
const fuse = new Fuse(mulberryData, {
  keys: ["symbol-en"],
  includeScore: true,
  threshold: 0.4, // Adjust this for more or less fuzzy matching
});

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]); // 👈 State to hold search results

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);

  const screenOptions = useMemo(
    () => ({
      title: deckName,
    }),
    [deckName]
  );

  const currentWord = deckData[currentIndex];

  const handleSearch = () => {
    const query = searchTerm.trim() || currentWord?.english || "";
    if (!query) return;

    console.log(`Searching for: "${query}"`);
    const results = fuse.search(query);
    setSearchResults(results.slice(0, 10)); // Limit to top 10 results
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
        {/* ... Word display UI is unchanged ... */}
        <Text style={styles.statusText}>
          Word {currentIndex + 1} of {deckData.length}
        </Text>
        <Text style={styles.wordText}>{currentWord?.english || "N/A"}</Text>
        <Text style={styles.infoText}>
          (Symbol assigned: {currentWord?.symbol_filename ? "Yes" : "No"})
        </Text>
      </View>

      <View style={styles.searchContainer}>
        {/* ... Search input UI is unchanged ... */}
        <TextInput
          style={styles.searchInput}
          placeholder="Custom Search..."
          placeholderTextColor="#888"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.navButtonText}>Refresh Search</Text>
        </TouchableOpacity>
      </View>

      {/* --- DISPLAY SEARCH RESULTS --- */}
      <ScrollView style={styles.resultsContainer}>
        {searchResults.map(({ item, score }) => (
          <View key={item["symbol-en"]} style={styles.resultItem}>
            <Text style={styles.resultText}>{item["symbol-en"]}</Text>
            <Text style={styles.resultScore}>
              Score: {Math.round((1 - score) * 100)}%
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.navContainer}>
        {/* ... Nav buttons are unchanged ... */}
        <TouchableOpacity
          style={[styles.navButton, isAtStart && styles.disabledButton]}
          onPress={prevWord}
          disabled={isAtStart}
        >
          <Text style={styles.navButtonText}>{"<< Previous"}</Text>
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
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 10,
  },
  wordContainer: {
    width: "100%",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
  },
  statusText: {
    color: "gray",
    fontSize: 18,
    marginBottom: 10,
  },
  wordText: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  infoText: {
    color: "cyan",
    fontSize: 14,
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
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
  resultsContainer: {
    flex: 1,
    width: "100%",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  // --- NEW STYLES for the results list ---
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultText: {
    color: "white",
    fontSize: 16,
  },
  resultScore: {
    color: "gray",
    fontSize: 12,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
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
  disabledButton: {
    backgroundColor: "#444444",
  },
  navButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
