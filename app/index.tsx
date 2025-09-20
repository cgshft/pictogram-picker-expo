// app/index.tsx
import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router"; // Import useFocusEffect
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDeckStore } from "../state/store";
import { vocabularyData } from "../assets/vocabulary.js";

const DECK_STORAGE_KEY = "@CurrentDeckState"; // Use the same key

export default function StartScreen() {
  const router = useRouter();
  const { loadDeck, restoreState, clearSavedState } = useDeckStore();
  const [savedDeckName, setSavedDeckName] = useState(null);

  // useFocusEffect will run every time the screen comes into view
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
          await clearSavedState(); // Clear any old session
          loadDeck(results.data, fileName); // This will save the new state via subscribe
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

  const handleStartNew = async () => {
    await clearSavedState(); // Clear any old session before starting
    loadDeck(vocabularyData, "New Deck.csv"); // This will save the new state via subscribe
    router.push("/picker");
  };

  const handleResume = async () => {
    const success = await restoreState(); // Restore state from storage into the store
    if (success) {
      router.push("/picker");
    } else {
      Alert.alert(
        "Error",
        "Could not load saved session. It may be corrupted."
      );
      await clearSavedState(); // Clear the corrupted state
      setSavedDeckName(null); // Clear the button if loading fails
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symbol Picker</Text>
      <View style={styles.buttonContainer}>
        {/* Conditionally render the Resume button */}
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
    </View>
  );
}

// Update styles to include the new resume button style
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
    backgroundColor: "#34C759", // A green color for "resume"
  },
  secondaryButton: {
    backgroundColor: "#444444",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});     