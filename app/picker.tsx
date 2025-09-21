// app/picker.tsx
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
  Alert,
  Switch,
  Image,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import Papa from "papaparse";
import { Asset } from "expo-asset"; // Import the Asset module
import {
  cacheApiResults,
  getRepositoryDirectory,
  setupRepositoryAndGetFile,
  saveTextSymbol,
  saveCombinedSymbol,
} from "../services/cachingService";

// Local Symbol Data
import { mulberryData } from "../assets/mulberrySymbols.js";
import { openmojiData } from "../assets/openmojiSymbols.js";
import { picomData } from "../assets/picomSymbols.js";
import { scleraData } from "../assets/scleraSymbols.js";
import { blissData } from "../assets/blissSymbols.js";
import { notoEmojiData } from "../assets/notoEmojiSymbols.js";

// Local Symbol Image Data
import { mulberryImages } from "../assets/mulberryImages.js";
import { openmojiImages } from "../assets/openmojiImages.js";
import { picomImages } from "../assets/picomImages.js";
import { scleraImages } from "../assets/scleraImages.js";
import { blissImages } from "../assets/blissImages.js";
import { notoEmojiImages } from "../assets/notoEmojiImages.js";

// Components
import SymbolItem from "../components/SymbolItem";
import TextSymbolModal from "../components/TextSymbolModal";
import CombinePreviewModal from "../components/CombinePreviewModal";

// --- (Fuse.js setup remains the same) ---
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

const FLATICON_API_KEY = "YOUR_API_KEY_HERE";

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState({});
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [flaticonResults, setFlaticonResults] = useState([]);
  const [isFlaticonLoading, setIsFlaticonLoading] = useState(false);
  const [textSymbolInput, setTextSymbolInput] = useState("");
  const [isTextModalVisible, setIsTextModalVisible] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selection, setSelection] = useState([]);
  const [isOrType, setIsOrType] = useState(true);
  const [isCombineModalVisible, setIsCombineModalVisible] = useState(false);

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);
  const selectSymbol = useDeckStore((state) => state.selectSymbol);

  const currentWord = deckData[currentIndex];

  const handleSymbolPress = async (item, sourceName) => {
    const uniqueId = `${sourceName}-${
      item.filename || item.hexcode || item.id || item["symbol-en"]
    }`;

    if (isMultiSelect) {
      if (selection.find((s) => s.uniqueId === uniqueId)) {
        setSelection(selection.filter((s) => s.uniqueId !== uniqueId));
        return;
      }

      const selectionItem = {
        ...item,
        uniqueId,
        sourceName,
        name: item["symbol-en"] || item.name || item.annotation || "untitled",
        imageUrl: null,
        localUri: null,
      };

      if (item.imageUrl) {
        selectionItem.imageUrl = item.imageUrl;
      } else {
        const imageMap = {
          Mulberry: mulberryImages,
          OpenMoji: openmojiImages,
          Picom: picomImages,
          Sclera: scleraImages,
          Bliss: blissImages,
          "Noto Emoji": notoEmojiImages,
        };

        const keyMap = {
          Mulberry: item.filename,
          OpenMoji: item.hexcode,
          Picom: item.filename,
          Sclera: item.filename,
          Bliss: item.filename,
          "Noto Emoji": item.filename,
        };

        const imageResource = imageMap[sourceName]?.[keyMap[sourceName]];

        if (imageResource) {
          try {
            const asset = Asset.fromModule(imageResource);
            await asset.downloadAsync();
            if (asset.localUri) {
              selectionItem.localUri = asset.localUri;
            } else {
              throw new Error("Asset downloaded but no local URI available.");
            }
          } catch (e) {
            console.error("Failed to load local asset:", e);
            Alert.alert("Error", "Could not load the selected local symbol.");
            return;
          }
        } else {
          Alert.alert(
            "Error",
            `Could not find the image resource for selection.`
          );
          return;
        }
      }
      setSelection([...selection, selectionItem]);
    } else {
      let symbolName =
        sourceName === "Mulberry" ? item["symbol-en"] : item.name;
      selectSymbol(symbolName, sourceName, item.filename);
    }
  };

  const handleFlaticonSearch = async () => {
    if (FLATICON_API_KEY === "YOUR_API_KEY_HERE" || !FLATICON_API_KEY) {
      Alert.alert("API Key Needed", "Please add your Freepik API key.");
      return;
    }
    const query = searchTerm.trim() || currentWord?.english || "";
    if (!query) return;
    setIsFlaticonLoading(true);
    setFlaticonResults([]);
    const headers = {
      "x-freepik-api-key": FLATICON_API_KEY,
      Accept: "application/json",
    };
    try {
      const searchUrl = `https://api.freepik.com/v1/icons?term=${encodeURIComponent(
        query
      )}&limit=16&order=relevance`;
      const searchResponse = await fetch(searchUrl, { headers });
      if (!searchResponse.ok)
        throw new Error(`Flaticon search failed: ${searchResponse.status}`);
      const searchJson = await searchResponse.json();
      const iconItems = (searchJson.data || []).slice(0, 4);
      if (iconItems.length === 0) {
        setIsFlaticonLoading(false);
        return;
      }
      const downloadUrlPromises = iconItems.map((item) => {
        const downloadUrl = `https://api.freepik.com/v1/icons/${item.id}/download?format=png`;
        return fetch(downloadUrl, { headers }).then((res) => res.json());
      });
      const downloadResponses = await Promise.all(downloadUrlPromises);
      const processedResults = downloadResponses
        .map((downloadRes, index) => {
          const originalItem = iconItems[index];
          const downloadData = downloadRes.data;
          const imageUrl = downloadData?.url;
          if (!imageUrl) return null;
          const name =
            originalItem.description || downloadData.filename || "untitled";
          return {
            item: { id: originalItem.id, name, imageUrl },
            score: 0,
            refIndex: originalItem.id,
          };
        })
        .filter(Boolean);
      setFlaticonResults(processedResults);
      if (processedResults.length > 0) {
        const repoDir = await getRepositoryDirectory();
        const metadataFile = repoDir
          ? await setupRepositoryAndGetFile(repoDir)
          : null;
        if (repoDir && metadataFile) {
          cacheApiResults(
            processedResults,
            "Flaticon",
            query,
            repoDir,
            metadataFile
          );
        }
      }
    } catch (error) {
      console.error("Flaticon API error:", error);
      Alert.alert(
        "Error",
        `Failed to fetch symbols from Flaticon: ${error.message}`
      );
    } finally {
      setIsFlaticonLoading(false);
    }
  };

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

  const handleExportMetadata = async () => {
    if (Platform.OS === "web") {
      alert("Metadata export is a mobile-only feature.");
      return;
    }
    try {
      const repoDir = await getRepositoryDirectory();
      if (!repoDir) return;
      const contents = await repoDir.list();
      const metadataFile = contents.find(
        (item) =>
          item.name === "api_symbol_metadata.csv" && item instanceof File
      );
      if (!metadataFile) {
        alert("Metadata log not found.");
        return;
      }
      await Sharing.shareAsync(metadataFile.uri, {
        mimeType: "text/csv",
        dialogTitle: "Export your symbol metadata log",
      });
    } catch (error) {
      console.error("Error exporting metadata file:", error);
      alert("Failed to export metadata CSV.");
    }
  };

  const screenOptions = useMemo(
    () => ({
      title: deckName,
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <Button onPress={handleExport} title="Export Deck" />
          <View style={{ width: 10 }} />
          <Button onPress={handleExportMetadata} title="Export Log" />
        </View>
      ),
    }),
    [deckName, deckData]
  );

  const performSearch = async (query: string) => {
    if (!query) {
      setSearchResults({});
      return;
    }
    console.log(`---- NEW SEARCH ----`);
    console.log(`Searching for: "${query}"`);
    setFlaticonResults([]);
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
    setIsApiLoading(true);

    try {
      const repoDir = await getRepositoryDirectory();
      const metadataFile = repoDir
        ? await setupRepositoryAndGetFile(repoDir)
        : null;
      if (!repoDir || !metadataFile) {
        setIsApiLoading(false);
        return;
      }
      const arasaacPromise = fetch(
        `https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(
          query
        )}`
      );
      const globalSymbolsPromise = fetch(
        `https://globalsymbols.com/api/v1/labels/search?query=${encodeURIComponent(
          query
        )}&symbolset=aac-image-library&language=eng&language_iso_format=639-3&limit=4`
      );
      const [arasaacResponse, globalSymbolsResponse] = await Promise.all([
        arasaacPromise,
        globalSymbolsPromise,
      ]);
      const newApiResults = {};

      if (arasaacResponse.ok) {
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
        if (arasaacResults.length > 0) {
          newApiResults.ARASAAC = arasaacResults;
          cacheApiResults(
            arasaacResults,
            "ARASAAC",
            query,
            repoDir,
            metadataFile
          );
        }
      }

      if (globalSymbolsResponse.ok) {
        const globalSymbolsJson = await globalSymbolsResponse.json();
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
        if (processedResults.length > 0) {
          newApiResults["AAC Image Library"] = processedResults;
          cacheApiResults(
            processedResults,
            "AAC Image Library",
            query,
            repoDir,
            metadataFile
          );
        }
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

  const handleCreateTextSymbol = () => {
    if (textSymbolInput.trim()) {
      setIsTextModalVisible(true);
    }
  };

  const handleSaveTextSymbol = async ({ base64Data, symbolName }) => {
    setIsTextModalVisible(false);
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) {
      Alert.alert("Error", "Repository directory not set.");
      return;
    }
    const savedFile = await saveTextSymbol(repoDir, base64Data, symbolName);
    if (savedFile) {
      selectSymbol(symbolName, "Custom Text", savedFile.filename);
      setTextSymbolInput("");
    }
  };

  const toggleMultiSelect = () => {
    setIsMultiSelect(!isMultiSelect);
    setSelection([]);
  };

  const handleCombine = () => {
    if (selection.length < 2) {
      Alert.alert("Select More Symbols", "Please select at least two symbols.");
      return;
    }
    setIsCombineModalVisible(true);
  };

  const handleSaveCombination = async ({ base64Data, combinedName }) => {
    setIsCombineModalVisible(false);
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) return;

    const savedFile = await saveCombinedSymbol(
      repoDir,
      base64Data,
      combinedName
    );

    if (savedFile) {
      selectSymbol(combinedName, "Combined", savedFile.filename);
      toggleMultiSelect();
    }
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
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.navButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.searchButton, styles.flaticonButton]}
            onPress={handleFlaticonSearch}
            disabled={isFlaticonLoading}
          >
            <Text style={styles.navButtonText}>Flaticon</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.textSymbolContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter Unicode character (e.g., ∑, ✈)..."
          placeholderTextColor="#888"
          value={textSymbolInput}
          onChangeText={setTextSymbolInput}
          onSubmitEditing={handleCreateTextSymbol}
        />
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateTextSymbol}
        >
          <Text style={styles.navButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.multiSelectToggleContainer}>
        <TouchableOpacity
          style={[
            styles.searchButton,
            isMultiSelect && styles.multiSelectActiveButton,
          ]}
          onPress={toggleMultiSelect}
        >
          <Text style={styles.navButtonText}>
            {isMultiSelect ? "Cancel Combination" : "Select Multiple"}
          </Text>
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
                  onPress={() => handleSymbolPress(item.item, sourceName)}
                />
              )}
              keyExtractor={(item, index) =>
                `${sourceName}-${item.refIndex}-${index}`
              }
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
        {isApiLoading && (
          <ActivityIndicator style={{ margin: 20 }} size="large" />
        )}
        {isFlaticonLoading && (
          <ActivityIndicator style={{ margin: 20 }} size="large" />
        )}
        {!isFlaticonLoading && flaticonResults.length > 0 && (
          <View style={styles.sourceContainer}>
            <Text style={styles.sourceHeader}>Flaticon</Text>
            <FlatList
              data={flaticonResults}
              renderItem={({ item }) => (
                <SymbolItem
                  item={item.item}
                  source={"Flaticon" as any}
                  onPress={() => handleSymbolPress(item.item, "Flaticon")}
                />
              )}
              keyExtractor={(item) => `Flaticon-${item.refIndex}`}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>
      {isMultiSelect && (
        <View style={styles.trayContainer}>
          <Text style={styles.trayTitle}>
            Selected Symbols ({selection.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.trayScrollView}
          >
            {selection.map((item) => {
              const sourceUri = item.localUri || item.imageUrl;
              return sourceUri ? (
                <Image
                  key={item.uniqueId}
                  source={{ uri: sourceUri }}
                  style={styles.trayThumbnail}
                />
              ) : null;
            })}
          </ScrollView>
          <View style={styles.trayControls}>
            <View style={styles.switchRow}>
              <Text style={styles.label}>Use '||' Separator</Text>
              <Switch value={isOrType} onValueChange={setIsOrType} />
            </View>
            <Button
              title="Clear"
              onPress={() => setSelection([])}
              color="#888"
            />
            <Button
              title="Combine & Save"
              onPress={handleCombine}
              disabled={selection.length < 2}
            />
          </View>
        </View>
      )}
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
      <CombinePreviewModal
        visible={isCombineModalVisible}
        selection={selection}
        isOrType={isOrType}
        onClose={() => setIsCombineModalVisible(false)}
        onSave={handleSaveCombination}
      />
      <TextSymbolModal
        visible={isTextModalVisible}
        text={textSymbolInput}
        onClose={() => setIsTextModalVisible(false)}
        onSave={handleSaveTextSymbol}
      />
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
    alignItems: "center",
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
  buttonGroup: { flexDirection: "row" },
  searchButton: {
    backgroundColor: "#555",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  flaticonButton: { backgroundColor: "#00A99D", marginLeft: 8 },
  resultsScrollView: { flex: 1, width: "100%" },
  sourceContainer: { marginBottom: 20 },
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
  textSymbolContainer: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  createButton: {
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  multiSelectToggleContainer: { paddingHorizontal: 10, marginBottom: 10 },
  multiSelectActiveButton: { backgroundColor: "#FF3B30" },
  trayContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#1C1C1E",
  },
  trayTitle: { color: "white", fontWeight: "bold", marginBottom: 5 },
  trayScrollView: { marginBottom: 10 },
  trayThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: "#555",
    marginRight: 10,
  },
  trayControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchRow: { flexDirection: "row", alignItems: "center" },
  label: { color: "#ccc", marginRight: 10 },
});
