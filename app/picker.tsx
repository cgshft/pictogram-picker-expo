import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import { mulberryData } from "../assets/mulberrySymbols.js";
import { openmojiData } from "../assets/openmojiSymbols.js";
import SymbolItem from "../components/SymbolItem";
import { picomData } from "../assets/picomSymbols.js";
import { scleraData } from "../assets/scleraSymbols.js";
import { blissData } from "../assets/blissSymbols.js";
import { notoEmojiData } from "../assets/notoEmojiSymbols.js";

const fuseMulberry = new Fuse(mulberryData, {
  keys: ["symbol-en"],
  includeScore: true,
  threshold: 0.4,
});

const fuseOpenMoji = new Fuse(openmojiData, {
  keys: ["annotation", "tags"],
  includeScore: true,
  threshold: 0.4,
});

const fusePicom = new Fuse(picomData, {
  keys: ["name"],
  includeScore: true,
  threshold: 0.4,
});

const fuseSclera = new Fuse(scleraData, {
  keys: ["search_term"],
  includeScore: true,
  threshold: 0.4,
});

const fuseBliss = new Fuse(blissData, {
  keys: ["name"],
  includeScore: true,
  threshold: 0.4,
});

const fuseNotoEmoji = new Fuse(notoEmojiData, {
  keys: ["search_terms"],
  includeScore: true,
  threshold: 0.4,
});

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  // --- CHANGE #1: The state will now be an object, not an array ---
  const [searchResults, setSearchResults] = useState({});

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);
  const selectSymbol = useDeckStore((state) => state.selectSymbol);

  const screenOptions = useMemo(() => ({ title: deckName }), [deckName]);

  const currentWord = deckData[currentIndex];

  // --- CHANGE #2: Update search logic to group results by source ---
  const performSearch = (query: string) => {
    if (!query) {
      setSearchResults({});
      return;
    }
    console.log(`Searching for: "${query}"`);

    const mulberryResults = fuseMulberry.search(query).slice(0, 4);
    const openMojiResults = fuseOpenMoji.search(query).slice(0, 4);
    const picomResults = fusePicom.search(query).slice(0, 4);
    const scleraResults = fuseSclera.search(query).slice(0, 4);
    const blissResults = fuseBliss.search(query).slice(0, 4);
    const notoEmojiResults = fuseNotoEmoji.search(query).slice(0, 4);

    const resultsBySource = {};
    if (mulberryResults.length > 0) resultsBySource.Mulberry = mulberryResults;
    if (openMojiResults.length > 0) resultsBySource.OpenMoji = openMojiResults;
    if (picomResults.length > 0) resultsBySource.Picom = picomResults; 
    if (scleraResults.length > 0) resultsBySource.Sclera = scleraResults;
    if (blissResults.length > 0) resultsBySource.Bliss = blissResults;
    if (notoEmojiResults.length > 0)
      resultsBySource["Noto Emoji"] = notoEmojiResults;

    setSearchResults(resultsBySource);
  };

  useEffect(() => {
    const newWordQuery = deckData[currentIndex]?.english;
    if (newWordQuery) {
      setSearchTerm("");
      performSearch(newWordQuery);
    }
  }, [currentIndex, deckData]);

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
      {/* Word and Search UI are unchanged */}
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

      {/* --- CHANGE #3: New rendering logic for grouped results --- */}
      <ScrollView style={styles.resultsScrollView}>
        {Object.keys(searchResults).map((sourceName) => (
          <View key={sourceName} style={styles.sourceContainer}>
            <Text style={styles.sourceHeader}>{sourceName}</Text>
            <FlatList
              data={searchResults[sourceName]}
              renderItem={({ item }) => (
                <SymbolItem
                  item={item.item}
                  source={
                    sourceName as
                      | "Mulberry"
                      | "OpenMoji"
                      | "Picom"
                      | "Sclera"
                      | "Bliss"
                      | "Noto Emoji"
                  }
                  onPress={() => {
                    let symbolName = "";
                    if (sourceName === "Mulberry")
                      symbolName = item.item["symbol-en"];
                    else if (sourceName === "OpenMoji")
                      symbolName = item.item.annotation;
                    else if (
                      ["Picom", "Sclera", "Bliss", "Noto Emoji"].includes(
                        sourceName
                      )
                    ) {
                      symbolName = item.item.name;
                    }
                    selectSymbol(symbolName, sourceName);
                  }}
                />
              )}
              keyExtractor={(item) => `${sourceName}-${item.refIndex}`}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
      </ScrollView>

      {/* Nav buttons are unchanged */}
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

// --- CHANGE #4: Add/update styles for new layout ---
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
  resultsScrollView: {
    flex: 1,
    width: "100%",
  },
  sourceContainer: {
    marginBottom: 20, // Space between source rows
  },
  sourceHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    marginBottom: 5,
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
