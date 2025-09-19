import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useDeckStore } from "../state/store";
import { Stack } from "expo-router";

export default function PickerScreen() {
  // --- FIX: Select each piece of state individually ---
  const deckData = useDeckStore((state) => state.deckData);
  const currentIndex = useDeckStore((state) => state.currentIndex);
  const isLoaded = useDeckStore((state) => state.isLoaded);
  const deckName = useDeckStore((state) => state.deckName);

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

      <Text style={styles.statusText}>
        Word {currentIndex + 1} of {deckData.length}
      </Text>
      <Text style={styles.wordText}>{currentWord?.english || "N/A"}</Text>
      <Text style={styles.infoText}>
        (Symbol assigned: {currentWord?.symbol_filename ? "Yes" : "No"})
      </Text>
    </View>
  );
}

// ... (styles are unchanged)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
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
});
