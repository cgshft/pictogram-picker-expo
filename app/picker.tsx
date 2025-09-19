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
  Button,
  Platform,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import Papa from "papaparse";

import { mulberryData } from "../assets/mulberrySymbols.js";
import { openmojiData } from "../assets/openmojiSymbols.js";
import { picomData } from "../assets/picomSymbols.js";
import { scleraData } from "../assets/scleraSymbols.js";
import { blissData } from "../assets/blissSymbols.js";
import { notoEmojiData } from "../assets/notoEmojiSymbols.js";
import SymbolItem from "../components/SymbolItem";

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
  const [searchResults, setSearchResults] = useState({});
  const [isApiLoading, setIsApiLoading] = useState(false);

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);
  const selectSymbol = useDeckStore((state) => state.selectSymbol);

  const handleExport = async () => {
    if (deckData.length === 0) {
      alert("No data to export.");
      return;
    }
    const csvString = Papa.unparse(deckData);
    const filename = `export_${Date.now()}.csv`;

    if (Platform.OS === "web") {
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const file = new File(Paths.cache, filename);
      try {
        await file.write(csvString);
        if (!(await Sharing.isAvailableAsync())) {
          alert("Sharing isn't available on your platform");
          return;
        }
        await Sharing.shareAsync(file.uri);
      } catch (error) {
        console.error("Error exporting file:", error);
        alert("Failed to export CSV.");
      }
    }
  };

  const screenOptions = useMemo(
    () => ({
      title: deckName,
      headerRight: () => <Button onPress={handleExport} title="Export" />,
    }),
    [deckName, deckData]
  );

  const currentWord = deckData[currentIndex];

  const performSearch = async (query: string) => {
    if (!query) {
      setSearchResults({});
      return;
    }
    console.log(`Searching for: "${query}"`);

    // --- Local search (unchanged) ---
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

    // --- API search with logging ---
    setIsApiLoading(true);
    try {
      const arasaacPromise = fetch(
        `https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(
          query
        )}`
      );

      // --- DEBUG STEP 1: Log the URL we are fetching ---
      const globalSymbolsUrl = `https://globalsymbols.com/api/v1/labels/search?query=${encodeURIComponent(
        query
      )}&symbolset=aac-image-library&language=eng&language_iso_format=639-3&limit=4`;
      console.log("Fetching Global Symbols URL:", globalSymbolsUrl);
      const globalSymbolsPromise = fetch(globalSymbolsUrl);

      const [arasaacResponse, globalSymbolsResponse] = await Promise.all([
        arasaacPromise,
        globalSymbolsPromise,
      ]);

      const newApiResults = {};

      if (arasaacResponse.ok) {
        // ARASAAC logic is unchanged
        const arasaacJson = await arasaacResponse.json();
        const arasaacResults = arasaacJson.slice(0, 4).map((result) => ({
          item: {
            id: result._id,
            name: result.keywords?.[0]?.keyword || "untitled",
            imageUrl: `https://api.arasaac.org/api/pictograms/${result._id}`,
          },
          score: 0,
          refIndex: result._id,
        }));
        if (arasaacResults.length > 0) newApiResults.ARASAAC = arasaacResults;
      }

      if (globalSymbolsResponse.ok) {
        const globalSymbolsJson = await globalSymbolsResponse.json();

        // --- DEBUG STEP 2: Log the entire JSON response ---
        console.log(
          "Global Symbols API Response:",
          JSON.stringify(globalSymbolsJson, null, 2)
        );

        const processedResults = globalSymbolsJson
          .map((label) => ({
            item: {
              id: label.picto.id,
              name: label.text,
              imageUrl: label.picto.image_url,
            },
            score: 0,
            refIndex: label.picto.id,
          }))
          .slice(0, 4);

        // --- DEBUG STEP 3: Log the results after processing ---
        console.log("Processed AAC Image Library Results:", processedResults);

        if (processedResults.length > 0) {
          newApiResults["AAC Image Library"] = processedResults;
        }
      } else {
        // --- DEBUG STEP 4: Log an error if the request failed ---
        console.error(
          "Global Symbols API request failed with status:",
          globalSymbolsResponse.status
        );
      }

      if (Object.keys(newApiResults).length > 0) {
        setSearchResults((prevResults) => ({
          ...prevResults,
          ...newApiResults,
        }));
      }
    } catch (error) {
      console.error("API search error:", error);
    } finally {
      setIsApiLoading(false);
    }
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
      <ScrollView style={styles.resultsScrollView}>
        {Object.keys(searchResults).map((sourceName) => (
          <View key={sourceName} style={styles.sourceContainer}>
            <Text style={styles.sourceHeader}>{sourceName}</Text>
            <FlatList
              data={searchResults[sourceName]}
              renderItem={({ item }) => (
                <SymbolItem
                  item={item.item}
                  source={sourceName as any}
                  onPress={() => {
                    let symbolName = "";
                    if (sourceName === "Mulberry")
                      symbolName = item.item["symbol-en"];
                    else {
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
        {isApiLoading && (
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceHeader}>API Sources</Text>
            <ActivityIndicator style={{ margin: 20 }} size="large" />
          </View>
        )}
      </ScrollView>
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
    marginBottom: 20,
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
