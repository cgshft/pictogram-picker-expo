import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";

export default function SkeletonSymbolItem() {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <ActivityIndicator color="#888" />
      </View>
      {/* <View style={styles.sourceBar} />
      <View style={styles.textBar} /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 100,
    padding: 5,
    margin: 5,
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
  },
  imageContainer: {
    width: "100%",
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3a3a3c",
    borderRadius: 4,
  },
  sourceBar: {
    width: "40%",
    height: 10,
    backgroundColor: "#3a3a3c",
    borderRadius: 4,
    marginTop: 8,
  },
  textBar: {
    width: "80%",
    height: 12,
    backgroundColor: "#3a3a3c",
    borderRadius: 4,
    marginTop: 6,
  },
});