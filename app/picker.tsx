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
  Keyboard,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";
import Fuse from "fuse.js";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import Papa from "papaparse";
import { Asset } from "expo-asset";
import {
  cacheApiResults,
  getRepositoryDirectory,
  saveTextSymbol,
  saveCombinedSymbolAndMetadata,
  saveSingleApiSymbol,
  autoSaveDeck,
} from "../services/cachingService";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

// Local Symbol Data & Components
import { mulberryData } from "../assets/mulberrySymbols.js";
import { openmojiData } from "../assets/openmojiSymbols.js";
import { picomData } from "../assets/picomSymbols.js";
import { scleraData } from "../assets/scleraSymbols.js";
import { blissData } from "../assets/blissSymbols.js";
import { notoEmojiData } from "../assets/notoEmojiSymbols.js";
import { mulberryImages } from "../assets/mulberryImages.js";
import { openmojiImages } from "../assets/openmojiImages.js";
import { picomImages } from "../assets/picomImages.js";
import { scleraImages } from "../assets/scleraImages.js";
import { blissImages } from "../assets/blissImages.js";
import { notoEmojiImages } from "../assets/notoEmojiImages.js";
import SymbolItem from "../components/SymbolItem";
import TextSymbolModal from "../components/TextSymbolModal";
import CombinePreviewModal from "../components/CombinePreviewModal";
import SkeletonSymbolItem from "../components/SkeletonSymbolItem";
import ApiKeyModal from "../components/ApiKeyModal";

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

const SOURCE_ORDER = [
  "ARASAAC",
  "AACIL",
  "Mulberry",
  "Picom",
  "OpenMoji",
  "Noto Emoji",
  "Sclera",
  "Bliss",
  "Flaticon",
];

export default function PickerScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [textSymbolInput, setTextSymbolInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [searchResults, setSearchResults] = useState({});
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isFlaticonLoading, setIsFlaticonLoading] = useState(false);
  const [isTextModalVisible, setIsTextModalVisible] = useState(false);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selection, setSelection] = useState([]);
  const [isOrType, setIsOrType] = useState(true);
  const [isCombineModalVisible, setIsCombineModalVisible] = useState(false);
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [activeInput, setActiveInput] = useState<
    "search" | "text" | "note" | null
  >(null);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"search" | "display">("search");
  const [selectedSymbolUri, setSelectedSymbolUri] = useState<string | null>(
    null
  );

  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);
  const selectSymbol = useDeckStore((state) => state.selectSymbol);
  const addNote = useDeckStore((state) => state.addNote);

  const currentWord = deckData[currentIndex];

  useEffect(() => {
    const newSearchTerm = currentWord?.english || "";
    if (currentWord?.symbol_filename) {
      setViewMode("display");
    } else {
      setViewMode("search");
      if (newSearchTerm) {
        performSearch(newSearchTerm);
      }
    }
    setNoteInput(currentWord?.notes || "");
  }, [currentWord]);

  useEffect(() => {
    if (isLoaded && deckData.length > 0 && deckName) {
      autoSaveDeck(deckData, deckName);
    }
  }, [deckData]);

  useEffect(() => {
    if (viewMode === "display" && currentWord?.symbol_filename) {
      const loadSymbolImage = async () => {
        setSelectedSymbolUri(null);
        try {
          const fileIdentifier = currentWord.symbol_filename;
          if (!fileIdentifier)
            throw new Error("Filename is missing from deck data.");

          // Use android_path if it exists, otherwise treat it as a local asset
          let fileUriToRead: string = currentWord.android_path;

          if (!fileUriToRead) {
            // Handle local assets
            const source = currentWord.symbol_source;
            const imageMap = {
              Mulberry: mulberryImages,
              OpenMoji: openmojiImages,
              Picom: picomImages,
              Sclera: scleraImages,
              Bliss: blissImages,
              "Noto Emoji": notoEmojiImages,
            };

            // --- FIX: Remove the file extension for ALL local sources ---
            // This ensures "candle_2.png" becomes "candle_2" before the lookup.
            const key = fileIdentifier.split(".")[0];

            const imageResource = imageMap[source]?.[key];
            if (imageResource) {
              const asset = Asset.fromModule(imageResource);
              await asset.downloadAsync();
              if (!asset.localUri)
                throw new Error(
                  `Asset for ${fileIdentifier} has no local URI.`
                );
              fileUriToRead = asset.localUri;
            } else {
              // Fallback for older data that might still use content:// in symbol_filename
              if (
                fileIdentifier.startsWith("content://") ||
                fileIdentifier.startsWith("file://")
              ) {
                fileUriToRead = fileIdentifier;
              } else {
                throw new Error(
                  `Could not find local asset for "${fileIdentifier}" in source "${source}".`
                );
              }
            }
          }
          const base64Content = await FileSystemLegacy.readAsStringAsync(
            fileUriToRead,
            { encoding: "base64" }
          );
          setSelectedSymbolUri(`data:image/png;base64,${base64Content}`);
        } catch (e) {
          console.error("Failed to load selected symbol image:", e);
          Alert.alert(
            "Error",
            `Could not load the selected symbol image: ${e.message}`
          );
          setSelectedSymbolUri(null);
        }
      };
      loadSymbolImage();
    }
  }, [viewMode, currentWord]);

  const handleFlaticonSearch = async () => {
    try {
      const key = await SecureStore.getItemAsync("flaticonApiKey");
      if (!key) {
        setIsApiKeyModalVisible(true);
        return;
      }
      const query = searchTerm.trim() || currentWord?.english || "";
      if (!query) {
        Alert.alert(
          "No Search Term",
          "Please select a word or type a custom search before using Flaticon."
        );
        return;
      }
      setIsFlaticonLoading(true);
      const headers = { "x-freepik-api-key": key, Accept: "application/json" };
      const searchUrl = `https://api.freepik.com/v1/icons?term=${encodeURIComponent(
        query
      )}&limit=16&order=relevance`;
      const searchResponse = await fetch(searchUrl, { headers });
      if (!searchResponse.ok)
        throw new Error(`Flaticon search failed: ${searchResponse.status}`);
      const searchJson = await searchResponse.json();
      const iconItems = (searchJson.data || []).slice(0, 4);
      if (iconItems.length === 0) {
        setSearchResults((prev) => ({ ...prev, Flaticon: [] }));
        return;
      }
      const downloadResponses = await Promise.all(
        iconItems.map((item) =>
          fetch(
            `https://api.freepik.com/v1/icons/${item.id}/download?format=png`,
            { headers }
          ).then((res) => res.json())
        )
      );
      const processedResults = downloadResponses
        .map((downloadRes, index) => {
          const originalItem = iconItems[index];
          const imageUrl = downloadRes.data?.url;
          if (!imageUrl) return null;
          const name =
            originalItem.description || downloadRes.data.filename || "untitled";
          return {
            item: { id: originalItem.id, name, imageUrl },
            score: 0,
            refIndex: originalItem.id,
          };
        })
        .filter(Boolean) as any[];
      setSearchResults((prev) => ({ ...prev, Flaticon: processedResults }));
      if (processedResults.length > 0) {
        const repoDir = await getRepositoryDirectory();
        if (repoDir) {
          cacheApiResults(processedResults, "Flaticon", query, repoDir);
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

  const handleSaveApiKey = async (key: string) => {
    try {
      await SecureStore.setItemAsync("flaticonApiKey", key);
      setIsApiKeyModalVisible(false);
      Alert.alert(
        "API Key Saved",
        "Your key has been saved. Please press the Flaticon button again to search."
      );
    } catch (error) {
      console.error("Failed to save API key:", error);
      Alert.alert("Error", "Could not save the API key.");
    }
  };

  const performSearch = async (query: string) => {
    if (!query) {
      setSearchResults({});
      return;
    }
    const mulberryResults = fuseMulberry.search(query).slice(0, 4);
    const openMojiResults = fuseOpenMoji.search(query).slice(0, 4);
    const picomResults = fusePicom.search(query).slice(0, 4);
    const scleraResults = fuseSclera.search(query).slice(0, 4);
    const blissResults = fuseBliss.search(query).slice(0, 4);
    const notoEmojiResults = fuseNotoEmoji.search(query).slice(0, 4);
    const localResults = {};
    if (mulberryResults.length > 0) localResults.Mulberry = mulberryResults;
    if (openMojiResults.length > 0) localResults.OpenMoji = openMojiResults;
    if (picomResults.length > 0) localResults.Picom = picomResults;
    if (scleraResults.length > 0) localResults.Sclera = scleraResults;
    if (blissResults.length > 0) localResults.Bliss = blissResults;
    if (notoEmojiResults.length > 0)
      localResults["Noto Emoji"] = notoEmojiResults;
    setSearchResults(localResults);
    setIsApiLoading(true);
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) {
      setIsApiLoading(false);
      return;
    }

    const arasaacPromise = fetch(
      `https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(
        query
      )}`
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((json) => {
        const results = json.slice(0, 4).map((r) => ({
          item: {
            id: r._id,
            name: r.keywords?.[0]?.keyword || "untitled",
            imageUrl: `https://api.arasaac.org/api/pictograms/${r._id}`,
          },
          score: 0,
          refIndex: r._id,
        }));
        if (results.length > 0) {
          setSearchResults((prev) => ({ ...prev, ARASAAC: results }));
          cacheApiResults(results, "ARASAAC", query, repoDir);
        }
      })
      .catch((e) => console.error("ARASAAC fetch failed:", e));
    const aacilPromise = fetch(
      `https://globalsymbols.com/api/v1/labels/search?query=${encodeURIComponent(
        query
      )}&symbolset=aac-image-library&language=eng&language_iso_format=639-3&limit=4`
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((json) => {
        const results = json
          .map((l) => ({
            item: { id: l.picto.id, name: l.text, imageUrl: l.picto.image_url },
            score: 0,
            refIndex: l.picto.id,
          }))
          .slice(0, 4);
        if (results.length > 0) {
          setSearchResults((prev) => ({ ...prev, AACIL: results }));
          cacheApiResults(results, "AACIL", query, repoDir);
        }
      })
      .catch((e) => console.error("AACIL fetch failed:", e));

    Promise.allSettled([arasaacPromise, aacilPromise]).finally(() => {
      setIsApiLoading(false);
    });
  };

    const handleSymbolPress = async (item, sourceName) => {
      const uniqueId = `${sourceName}-${
        item.filename || item.hexcode || item.id || item["symbol-en"]
      }`;

      if (isMultiSelect) {
        // Logic for adding a symbol to the multi-selection tray
        if (selection.find((s) => s.uniqueId === uniqueId)) {
          // Item is already selected, so de-select it
          setSelection((prev) => prev.filter((s) => s.uniqueId !== uniqueId));
          return;
        }

        // --- FIX: Robustly determine the base filename and add extension ---
        // Use the 'filename' property if it exists, otherwise fall back to 'hexcode' (for OpenMoji)
        const baseFilename = item.filename || item.hexcode;

        const selectionItem = {
          uniqueId,
          sourceName,
          name: item["symbol-en"] || item.name || item.annotation || "untitled",
          imageUrl: item.imageUrl || null,
          localUri: null,
          // For local symbols, create a complete filename. For API symbols, it's null.
          filename: item.imageUrl ? null : `${baseFilename}.png`,
          hexcode: item.hexcode,
          id: item.id,
        };

        // If the symbol is a local asset, we need to get its local URI for display
        if (!selectionItem.imageUrl) {
          const imageMap = {
            Mulberry: mulberryImages,
            OpenMoji: openmojiImages,
            Picom: picomImages,
            Sclera: scleraImages,
            Bliss: blissImages,
            "Noto Emoji": notoEmojiImages,
          };
          // Use the same robust identifier logic here
          const keyMapKey = item.filename || item.hexcode;
          const imageResource = imageMap[sourceName]?.[keyMapKey];

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
              `Could not find image resource for selection.`
            );
            return;
          }
        }
        setSelection((currentSelection) => [
          ...currentSelection,
          selectionItem,
        ]);
      } else {
        // --- This is the logic for single-symbol selection (UNCHANGED) ---
        const symbolName = item.name || item["symbol-en"];
        if (item.imageUrl) {
          // This is for API sources (ARASAAC, Flaticon, etc.)
          const repoDir = await getRepositoryDirectory();
          if (!repoDir) {
            Alert.alert("Error", "Repository directory not set.");
            return;
          }
          const savedFile = await saveSingleApiSymbol(
            repoDir,
            item,
            sourceName
          );
          if (savedFile) {
            selectSymbol(
              symbolName,
              sourceName,
              savedFile.filename,
              savedFile.fileUri
            );
          }
        } else {
          // This is for LOCAL sources (Mulberry, Sclera, etc.)
          const identifier = item.filename || item.hexcode;
          selectSymbol(symbolName, sourceName, `${identifier}.png`, null);
        }
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
      selectSymbol(
        symbolName,
        "Custom Text",
        savedFile.filename,
        savedFile.fileUri
      );
      nextWord();
    }
  };

  const handleSaveCombination = async ({ base64Data, combinedName }) => {
    setIsCombineModalVisible(false);
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) return;

    // --- UPDATED LOGIC ---
    // Replace the old saveCombinedSymbol with the new function that also handles metadata
    const savedFile = await saveCombinedSymbolAndMetadata(
      repoDir,
      base64Data,
      combinedName,
      selection, // Pass the full selection array
      isOrType // Pass the boolean for combination type
    );

    if (savedFile) {
      selectSymbol(
        combinedName,
        "Combined",
        savedFile.filename,
        savedFile.fileUri
      );
      toggleMultiSelect();
      nextWord();
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
  const handleSaveNote = () => {
    addNote(noteInput);
    setActiveInput(null);
    Keyboard.dismiss();
    Alert.alert("Note Saved!");
  };
  const handleSearch = () => {
    const query = searchTerm.trim() || currentWord?.english || "";
    performSearch(query);
    setActiveInput(null);
    Keyboard.dismiss();
  };
  const handleCreateTextSymbol = () => {
    if (textSymbolInput.trim()) {
      setIsTextModalVisible(true);
      setActiveInput(null);
      Keyboard.dismiss();
    }
  };
  const toggleMultiSelect = () => {
    setIsMultiSelect(!isMultiSelect);
    setSelection([]);
  };
  const toggleInputVisibility = (inputType: "search" | "text" | "note") => {
    setActiveInput((current) => (current === inputType ? null : inputType));
  };
  const handleCombine = () => {
    if (selection.length < 2) {
      Alert.alert("Select More Symbols", "Please select at least two symbols.");
      return;
    }
    setIsCombineModalVisible(true);
  };
  const handleExportPress = () => {
    Alert.alert("Export Data", "What would you like to export?", [
      { text: "Export Deck (.csv)", onPress: () => handleExport() },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const handleUpdatePress = () => {
    setViewMode("search");
    performSearch(currentWord?.english || "");
  };

  const screenOptions = useMemo(
    () => ({
      title: deckName,
      headerRight: () => (
        <View style={{ flexDirection: "row" }}>
          <Button onPress={handleExport} title="Export Deck" />
        </View>
      ),
    }),
    [deckName, deckData]
  );
  if (!isLoaded || deckData.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }
  const isAtStart = currentIndex === 0;
  const isAtEnd = currentIndex === deckData.length - 1;

  // The rest of the JSX and styles remain the same
  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />
      <View style={styles.wordContainer}>
        <View style={styles.wordInfoRow}>
          <Text style={styles.statusText}>
            Word {currentIndex + 1} / {deckData.length}
          </Text>
          <Text style={styles.infoText} numberOfLines={1}>
            Symbol: {currentWord?.symbol_name || "None"}
          </Text>
        </View>
        <Text style={styles.wordText} numberOfLines={1} adjustsFontSizeToFit>
          {currentWord?.english || "N/A"}
        </Text>
        {currentWord?.notes ? (
          <Text style={styles.noteTextDisplay}>Note: {currentWord.notes}</Text>
        ) : null}
      </View>
      <View style={styles.toolbarContainer}>
        <View style={styles.primaryToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => toggleInputVisibility("search")}
          >
            <Ionicons
              name="search"
              size={24}
              color={activeInput === "search" ? "#007AFF" : "white"}
            />
            <Text
              style={
                activeInput === "search"
                  ? styles.toolbarLabelActive
                  : styles.toolbarLabel
              }
            >
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => toggleInputVisibility("text")}
          >
            <Ionicons
              name="text"
              size={24}
              color={activeInput === "text" ? "#007AFF" : "white"}
            />
            <Text
              style={
                activeInput === "text"
                  ? styles.toolbarLabelActive
                  : styles.toolbarLabel
              }
            >
              Text
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => toggleInputVisibility("note")}
          >
            <Ionicons
              name="document-text-outline"
              size={24}
              color={activeInput === "note" ? "#007AFF" : "white"}
            />
            <Text
              style={
                activeInput === "note"
                  ? styles.toolbarLabelActive
                  : styles.toolbarLabel
              }
            >
              Note
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              isMultiSelect && styles.multiSelectActiveButton,
            ]}
            onPress={toggleMultiSelect}
          >
            <Ionicons name="copy" size={24} color="white" />
            <Text style={styles.toolbarLabel}>Select</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => setIsToolbarExpanded((v) => !v)}
          >
            <Ionicons
              name={isToolbarExpanded ? "chevron-up" : "chevron-down"}
              size={24}
              color="white"
            />
            <Text style={styles.toolbarLabel}>More</Text>
          </TouchableOpacity>
        </View>
        {isToolbarExpanded && (
          <View style={styles.secondaryToolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleSearch}
            >
              <Ionicons name="refresh" size={24} color="white" />
              <Text style={styles.toolbarLabel}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleFlaticonSearch}
              disabled={isFlaticonLoading}
            >
              <Ionicons name="cloud-download-outline" size={24} color="white" />
              <Text style={styles.toolbarLabel}>Flaticon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={handleExportPress}
            >
              <Ionicons name="share-outline" size={24} color="white" />
              <Text style={styles.toolbarLabel}>Export</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {activeInput === "search" && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Custom Search..."
            placeholderTextColor="#888"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            autoFocus={true}
          />
          <TouchableOpacity style={styles.goButton} onPress={handleSearch}>
            <Text style={styles.navButtonText}>Go</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeInput === "text" && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Unicode character (e.g., ∑, ✈)..."
            placeholderTextColor="#888"
            value={textSymbolInput}
            onChangeText={setTextSymbolInput}
            onSubmitEditing={handleCreateTextSymbol}
            autoFocus={true}
          />
          <TouchableOpacity
            style={styles.goButton}
            onPress={handleCreateTextSymbol}
          >
            <Text style={styles.navButtonText}>Create</Text>
          </TouchableOpacity>
        </View>
      )}
      {activeInput === "note" && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Add a note for this word..."
            placeholderTextColor="#888"
            value={noteInput}
            onChangeText={setNoteInput}
            onSubmitEditing={handleSaveNote}
            autoFocus={true}
          />
          <TouchableOpacity style={styles.goButton} onPress={handleSaveNote}>
            <Text style={styles.navButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {viewMode === "search" && (
        <ScrollView
          style={styles.resultsScrollView}
          keyboardShouldPersistTaps="handled"
        >
          {SOURCE_ORDER.map((sourceName) => {
            const results = searchResults[sourceName];
            const isApiSource =
              sourceName === "ARASAAC" || sourceName === "AACIL";
            const isFlaticonSourceAndLoading =
              sourceName === "Flaticon" && isFlaticonLoading;
            if (results && results.length > 0) {
              return (
                <View key={sourceName} style={styles.sourceContainer}>
                  <View style={styles.sourceHeaderContainer}>
                    <Text style={styles.sourceHeaderText}>{sourceName}</Text>
                  </View>
                  <FlatList
                    style={{ flex: 1 }}
                    data={results}
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
              );
            } else if (
              (isApiLoading && isApiSource) ||
              isFlaticonSourceAndLoading
            ) {
              return (
                <View
                  key={`${sourceName}-loading`}
                  style={styles.sourceContainer}
                >
                  <View style={styles.sourceHeaderContainer}>
                    <Text style={styles.sourceHeaderText}>{sourceName}</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <SkeletonSymbolItem />
                    <SkeletonSymbolItem />
                    <SkeletonSymbolItem />
                    <SkeletonSymbolItem />
                  </View>
                </View>
              );
            }
            return null;
          })}
        </ScrollView>
      )}
      {viewMode === "display" && (
        <View style={styles.displayContainer}>
          {selectedSymbolUri ? (
            <Image
              source={{ uri: selectedSymbolUri }}
              style={styles.displayImage}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator size="large" color="#FFFFFF" />
          )}
          <Text style={styles.displayInfoText}>
            Source: {currentWord?.symbol_source}
          </Text>
          <Button title="Update Symbol" onPress={handleUpdatePress} />
        </View>
      )}
      {isMultiSelect && (
        <View style={styles.trayContainer}>
          <Text style={styles.trayTitle}>
            Selected Symbols ({selection.length})
          </Text>
          <ScrollView horizontal style={styles.trayScrollView}>
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
      <ApiKeyModal
        visible={isApiKeyModalVisible}
        onClose={() => setIsApiKeyModalVisible(false)}
        onSave={handleSaveApiKey}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#1C1C1E" },
  wordContainer: { width: "100%", paddingHorizontal: 10, marginBottom: 10 },
  wordInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusText: { color: "gray", fontSize: 14 },
  infoText: { color: "cyan", fontSize: 14, fontStyle: "italic", flexShrink: 1 },
  wordText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  noteTextDisplay: {
    color: "#FF9500",
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  toolbarContainer: {
    backgroundColor: "#2C2C2E",
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  secondaryToolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#444",
  },
  toolbarButton: { flex: 1, alignItems: "center", padding: 4 },
  toolbarLabel: { color: "white", fontSize: 10, marginTop: 2 },
  toolbarLabelActive: { color: "#007AFF", fontSize: 10, marginTop: 2 },
  multiSelectActiveButton: { backgroundColor: "#007AFF", borderRadius: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  goButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  resultsScrollView: { flex: 1, width: "100%" },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sourceHeaderContainer: {
    width: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },
  sourceHeaderText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    transform: [{ rotate: "-90deg" }],
    width: 140,
    textAlign: "center",
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
  displayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  displayImage: {
    width: 256,
    height: 256,
    marginBottom: 20,
  },
  displayInfoText: {
    color: "#ccc",
    fontSize: 16,
    fontStyle: "italic",
    marginBottom: 20,
  },
});
