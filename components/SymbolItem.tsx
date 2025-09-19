import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SvgXml } from "react-native-svg";
import { mulberrySvgData } from "../assets/mulberrySvgData.js";
import { openmojiImages } from "../assets/openmojiImages.js";
import { picomImages } from "../assets/picomImages.js";
import { scleraImages } from "../assets/scleraImages.js"; // 👈 Import Sclera images

interface SymbolItemProps {
  item: any;
  source: "Mulberry" | "OpenMoji" | "Picom" | "Sclera"; // 👈 Add Sclera to the type
  onPress: () => void;
}

export default function SymbolItem({ item, source, onPress }: SymbolItemProps) {
  let name, imageContent;

  if (source === "Mulberry") {
    name = item["symbol-en"];
    const sanitizedName = name.replace(/,/g, "");
    const svgContent = mulberrySvgData[sanitizedName];
    imageContent = svgContent ? (
      <SvgXml xml={svgContent} width="80%" height="80%" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (source === "OpenMoji") {
    name = item.annotation;
    const requirePath = openmojiImages[item.hexcode];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (source === "Picom") {
    name = item.name;
    const requirePath = picomImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (source === "Sclera") {
    // 👈 Add rendering logic for Sclera
    name = item.name;
    const requirePath = scleraImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>{imageContent}</View>
      <Text style={styles.sourceText}>{source}</Text>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 140, // Increased height for labels
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
    height: 80, // Fixed height for the image part
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "80%",
    height: "80%",
  },
  text: {
    color: "#E5E5EA",
    fontSize: 12,
    textAlign: "center",
    marginTop: 2,
  },
  sourceText: {
    color: "#8A8A8E",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },
  errorText: {
    color: "yellow",
    fontSize: 24,
  },
});
