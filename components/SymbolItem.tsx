// components/SymbolItem.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { mulberryImages } from "../assets/mulberryImages.js";
import { openmojiImages } from "../assets/openmojiImages.js";
import { picomImages } from "../assets/picomImages.js";
import { scleraImages } from "../assets/scleraImages.js";
import { blissImages } from "../assets/blissImages.js";
import { notoEmojiImages } from "../assets/notoEmojiImages.js";

interface SymbolItemProps {
  item: any;
  source:
    | "Mulberry"
    | "OpenMoji"
    | "Picom"
    | "Sclera"
    | "Bliss"
    | "Noto Emoji"
    | "ARASAAC"
    | "AAC Image Library"
    | "Flaticon";
  onPress: () => void;
}

export default function SymbolItem({ item, source, onPress }: SymbolItemProps) {
  let name, imageContent;

  if (source === "Mulberry") {
    name = item["symbol-en"];
    const requirePath = mulberryImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
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
    name = item.name;
    const requirePath = scleraImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (source === "Bliss") {
    name = item.name;
    const requirePath = blissImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (source === "Noto Emoji") {
    name = item.name;
    const requirePath = notoEmojiImages[item.filename];
    imageContent = requirePath ? (
      <Image source={requirePath} style={styles.image} resizeMode="contain" />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  } else if (
    source === "ARASAAC" ||
    source === "AAC Image Library" ||
    source === "Flaticon"
  ) {
    name = item.name;
    imageContent = item.imageUrl ? (
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        resizeMode="contain"
      />
    ) : (
      <Text style={styles.errorText}>?</Text>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>{imageContent}</View>
      {/* <Text style={styles.sourceText}>{source}</Text> */}
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 100,
    padding: 0,
    margin: 3,
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    // backgroundColor: "#2C2C2E",
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: "#444",
  },
  imageContainer: {
    width: '90%',
    height: '80%',
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
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
