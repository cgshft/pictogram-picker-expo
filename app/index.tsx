import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Papa from 'papaparse';
import { Asset } from 'expo-asset';

// Import our global store
import { useDeckStore } from '../state/store';

// --- CHANGE #1: Import the asset at the top of the file ---
// import baseVocabAsset from '../assets/en_word_diversity_ranking.csv';
import { vocabularyData } from "../assets/vocabulary.js";

export default function StartScreen() {
  const router = useRouter();
  const loadDeck = useDeckStore((state) => state.loadDeck);

  // ... (parseAndLoadCsv and handleLoadExisting functions are unchanged)
  const parseAndLoadCsv = (csvString, fileName) => {
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.errors.length === 0) {
          console.log(`Parsed ${results.data.length} rows successfully.`);
          loadDeck(results.data, fileName);
          router.push('/picker');
        } else {
          Alert.alert('CSV Parse Error', 'Could not read the CSV file. Please check the format.');
          console.error("CSV Parse Errors:", results.errors);
        }
      },
    });
  };

  const handleLoadExisting = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
      });

      if (!result.canceled) {
        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].name;
        const csvString = await FileSystem.readAsStringAsync(fileUri);
        parseAndLoadCsv(csvString, fileName);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open or read the file.');
      console.error(error);
    }
  };


  // const handleStartNew = async () => {
  //   try {
  //     // --- CHANGE #2: Use the imported asset reference ---
  //     const asset = Asset.fromModule(baseVocabAsset);
  //     await asset.downloadAsync();

  //     if (asset.localUri) {
  //       const csvString = await FileSystem.readAsStringAsync(asset.localUri);
  //       parseAndLoadCsv(csvString, 'New Deck.csv');
  //     } else {
  //        throw new Error('Asset could not be loaded.');
  //     }
  //   } catch (error) {
  //     Alert.alert('Error', 'Could not load the base vocabulary file.');
  //     console.error(error);
  //   }
  // };
  
  const handleStartNew = () => {
    // The data is already parsed and ready to use!
    loadDeck(vocabularyData, "New Deck.csv");
    router.push("/picker");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Symbol Picker</Text>
      <View style={styles.buttonContainer}>
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

// Styles remain the same
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
  secondaryButton: {
    backgroundColor: "#444444",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
