import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"; // 👈 Import TouchableOpacity
import { SvgXml } from "react-native-svg";
import { mulberrySvgData } from "../assets/mulberrySvgData.js";

// The component now accepts an onPress function
interface SymbolItemProps {
  name: string;
  onPress: () => void;
}

export default function SymbolItem({ name, onPress }: SymbolItemProps) {
  const sanitizedName = name.replace(/,/g, "");
  const svgContent = mulberrySvgData[sanitizedName];

  return (
    // Wrap the entire component in a TouchableOpacity
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {svgContent ? (
        <SvgXml xml={svgContent} width="80%" height="80%" />
      ) : (
        <Text style={styles.errorText}>?</Text>
      )}
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </TouchableOpacity>
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
    borderWidth: 1, // Add a border
    borderColor: "#444", // Border color
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
