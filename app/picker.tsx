import React, { useMemo, useState } from "react"; // 👈 Import useState
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native"; // 👈 Import TextInput
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";

export default function PickerScreen() {
  // --- STEP 1: Add state for the search input ---
  const [searchTerm, setSearchTerm] = useState("");

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

  // --- STEP 2: Create a placeholder search function ---
  const handleSearch = () => {
    // For now, we'll just log the search term.
    // In the next step, we'll use this to search for symbols.
    const query = searchTerm.trim() || currentWord?.english || "";
    console.log(`Searching for: "${query}"`);
  };

  if (!isLoaded || deckData.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const currentWord = deckData[currentIndex];
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
          (Symbol assigned: {currentWord?.symbol_filename ? "Yes" : "No"})
        </Text>
      </View>

      {/* --- STEP 3: Add the search UI components --- */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Custom Search..."
          placeholderTextColor="#888"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch} // Search when user presses return key
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.navButtonText}>Refresh Search</Text>
        </TouchableOpacity>
      </View>

      {/* This is the scrollable grid where results will go later */}
      <View style={styles.resultsContainer} />

      <View style={styles.navContainer}>
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

// --- STEP 4: Add new styles for the search controls ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start", // Changed
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
    fontSize: 32, // Adjusted size
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
    flex: 1, // This will take up the available space for search results
    width: "100%",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
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
