import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
// Import the pre-processed SVG data
import { mulberrySvgData } from "../assets/mulberrySvgData.js";

export default function SymbolItem({ name }: { name: string }) {
  // Sanitize the name to match the keys in our data object
  const sanitizedName = name.replace(/,/g, "");
  // Get the SVG content directly from the imported object
  const svgContent = mulberrySvgData[sanitizedName];

  return (
    <View style={styles.container}>
      {svgContent ? (
        <SvgXml xml={svgContent} width="80%" height="80%" />
      ) : (
        <Text style={styles.errorText}>?</Text> // Show ? if not found
      )}
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    padding: 8,
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 8,
  },
  text: {
    color: "#E5E5EA",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  errorText: {
    color: "yellow",
    fontSize: 24,
  },
});
