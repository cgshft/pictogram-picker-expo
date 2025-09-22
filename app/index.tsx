// app/index.tsx
import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDeckStore } from "../state/store";
import { vocabularyData } from "../assets/vocabulary.js";
import DeckNameModal from "../components/DeckNameModal"; // 👈 Import the new modal

const DECK_STORAGE_KEY = "@CurrentDeckState";

export default function StartScreen() {
  const router = useRouter();
  const { loadDeck, restoreState, clearSavedState } = useDeckStore();
  const [savedDeckName, setSavedDeckName] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false); // 👈 State for modal visibility

  useFocusEffect(
    React.useCallback(() => {
      const checkForSavedDeck = async () => {
        try {
          const jsonValue = await AsyncStorage.getItem(DECK_STORAGE_KEY);
          if (jsonValue) {
            const savedState = JSON.parse(jsonValue);
            if (savedState.deckName && savedState.deckData?.length > 0) {
              setSavedDeckName(savedState.deckName);
            } else {
              setSavedDeckName(null);
            }
          } else {
            setSavedDeckName(null);
          }
        } catch (e) {
          console.error("Failed to check for saved deck.", e);
          setSavedDeckName(null);
        }
      };
      checkForSavedDeck();
    }, [])
  );

  const parseAndLoadCsv = (csvString, fileName) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.data && results.errors.length === 0) {
          console.log(`Parsed ${results.data.length} rows successfully.`);
          await clearSavedState();
          loadDeck(results.data, fileName);
          router.push("/picker");
        } else {
          Alert.alert(
            "CSV Parse Error",
            "Could not read the CSV file. Please check the format."
          );
          console.error("CSV Parse Errors:", results.errors);
        }
      },
    });
  };

  const handleLoadExisting = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
      });

      if (!result.canceled) {
        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].name;
        const csvString = await FileSystem.readAsStringAsync(fileUri);
        parseAndLoadCsv(csvString, fileName);
      }
    } catch (error) {
      Alert.alert("Error", "Could not open or read the file.");
      console.error(error);
    }
  };

  // 👈 MODIFIED: This now opens the modal instead of starting directly
  const handleStartNew = () => {
    setIsModalVisible(true);
  };

  // 👈 NEW: This function handles saving the named deck
  const handleSaveNewDeck = async (name: string) => {
    setIsModalVisible(false); // Close the modal
    // Ensure the name ends with .csv for consistency
    const finalName = name.endsWith(".csv") ? name : `${name}.csv`;
    await clearSavedState();
    loadDeck(vocabularyData, finalName);
    router.push("/picker");
  };

  const handleResume = async () => {
    const success = await restoreState();
    if (success) {
      router.push("/picker");
    } else {
      Alert.alert(
        "Error",
        "Could not load saved session. It may be corrupted."
      );
      await clearSavedState();
      setSavedDeckName(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symbol Picker</Text>
      <View style={styles.buttonContainer}>
        {savedDeckName && (
          <TouchableOpacity
            style={[styles.button, styles.resumeButton]}
            onPress={handleResume}
          >
            <Text style={styles.buttonText}>Resume: {savedDeckName}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleStartNew}>
          <Text style={styles.buttonText}>Start New Symbol Deck</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleLoadExisting}
        >
          <Text style={styles.buttonText}>Load Existing Deck</Text>
        </TouchableOpacity>
      </View>

      {/* 👈 Render the modal component here */}
      <DeckNameModal
        visible={isModalVisible}
        onSave={handleSaveNewDeck}
        onClose={() => setIsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1C1C1E",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 40,
  },
  buttonContainer: {
    width: "80%",
    maxWidth: 400,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  resumeButton: {
    backgroundColor: "#34C759",
  },
  secondaryButton: {
    backgroundColor: "#555",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});