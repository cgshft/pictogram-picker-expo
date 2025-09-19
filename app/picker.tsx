import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";

export default function PickerScreen() {
  // --- FIX: Select EACH piece of state and action INDIVIDUALLY ---
  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);
  const nextWord = useDeckStore((state) => state.nextWord);
  const prevWord = useDeckStore((state) => state.prevWord);

  // Memoize the options object to prevent re-renders
  const screenOptions = useMemo(
    () => ({
      title: deckName,
    }),
    [deckName]
  );

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

// ... (styles are unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 40,
  },
  wordContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    color: "gray",
    fontSize: 18,
    marginBottom: 20,
  },
  wordText: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  infoText: {
    color: "cyan",
    fontSize: 14,
    marginTop: 10,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 10,
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
