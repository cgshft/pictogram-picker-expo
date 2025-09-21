// components/CombinePreviewModal.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Svg, Image as SvgImage, Text as SvgText } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";

const IMG_SIZE = 512;
const SEPARATOR_WIDTH = 250;
const SEPARATOR_VERTICAL_OFFSET = 90;

interface CombinePreviewModalProps {
  visible: boolean;
  selection: any[];
  isOrType: boolean;
  onClose: () => void;
  onSave: (result: { base64Data: string; combinedName: string }) => void;
}

const processImageToTemp = async (uri: string, index: number) => {
  if (!uri) return null;
  const tempFileUri =
    FileSystem.cacheDirectory + `combine_temp_${index}_${Date.now()}.png`;

  try {
    if (uri.startsWith("http")) {
      const downloadResult = await FileSystem.downloadAsync(uri, tempFileUri);
      return downloadResult.uri;
    } else {
      await FileSystem.copyAsync({ from: uri, to: tempFileUri });
      return tempFileUri;
    }
  } catch (e) {
    console.error(`Failed to process URI ${uri}:`, e);
    return null;
  }
};

export default function CombinePreviewModal({
  visible,
  selection,
  isOrType,
  onClose,
  onSave,
}: CombinePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageSources, setImageSources] = useState<string[]>([]);
  const [previewContainerWidth, setPreviewContainerWidth] = useState(0);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible && selection.length > 0) {
      const loadImages = async () => {
        setIsLoading(true);
        try {
          const urisToProcess = selection.map(
            (item) => item.imageUrl || item.localUri
          );
          const tempUris = await Promise.all(
            urisToProcess.map((uri, index) => processImageToTemp(uri, index))
          );

          const validUris = tempUris.filter(Boolean);
          if (validUris.length !== selection.length) {
            throw new Error("One or more images failed to load.");
          }

          const base64Sources = await Promise.all(
            validUris.map((uri) =>
              FileSystem.readAsStringAsync(uri, { encoding: "base64" })
            )
          );
          setImageSources(base64Sources);
        } catch (error) {
          console.error("Error loading images for combination:", error);
          Alert.alert(
            "Error",
            `Could not load one or more images. ${error.message}`
          );
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      loadImages();
    }
  }, [visible, selection]);

  const handleSave = async () => {
    if (!viewShotRef.current?.capture) return;
    try {
      const base64Data = await viewShotRef.current.capture({
        result: "base64",
        format: "png",
      });
      const combinedName = selection.map((s) => s.name).join(" / ");
      onSave({ base64Data, combinedName });
    } catch (error) {
      console.error("Failed to capture combined symbol:", error);
      Alert.alert("Error", "Could not create the combined symbol image.");
    }
  };

  const numSeparators = isOrType ? Math.max(0, selection.length - 1) : 0;
  const totalWidth =
    selection.length * IMG_SIZE + numSeparators * SEPARATOR_WIDTH;

  // FIX: This scale value will be used in a transform to shrink the view
  const scale =
    previewContainerWidth > 0 && totalWidth > 0
      ? Math.min(1, previewContainerWidth / totalWidth)
      : 1;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Combine Symbols</Text>
          <View
            style={styles.previewContainer}
            onLayout={(event) =>
              setPreviewContainerWidth(event.nativeEvent.layout.width)
            }
          >
            {isLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              // FIX: Removed ScrollView and applied scale transform directly
              <ViewShot
                ref={viewShotRef}
                options={{ format: "png", quality: 1.0 }}
                style={{ transform: [{ scale }] }}
              >
                <View style={{ backgroundColor: "white" }}>
                  <Svg
                    height={IMG_SIZE}
                    width={totalWidth}
                    viewBox={`0 0 ${totalWidth} ${IMG_SIZE}`}
                  >
                    {imageSources.map((base64, index) => {
                      const xOffset =
                        index * (IMG_SIZE + (isOrType ? SEPARATOR_WIDTH : 0));
                      return (
                        <React.Fragment key={index}>
                          <SvgImage
                            x={xOffset}
                            y="0"
                            width={IMG_SIZE}
                            height={IMG_SIZE}
                            href={`data:image/png;base64,${base64}`}
                          />
                          {isOrType && index < imageSources.length - 1 && (
                            <SvgText
                              x={xOffset + IMG_SIZE + SEPARATOR_WIDTH / 2}
                              y={IMG_SIZE / 2}
                              dy={SEPARATOR_VERTICAL_OFFSET}
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fontSize={250}
                              fill="black"
                              fontFamily="sans-serif"
                              fontWeight="bold"
                            >
                              ||
                            </SvgText>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </View>
              </ViewShot>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <Button title="Cancel" onPress={onClose} color="#888" />
            <View style={{ width: 20 }} />
            <Button
              title="Save Combination"
              onPress={handleSave}
              disabled={isLoading}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    width: "95%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "white",
  },
  previewContainer: {
    width: "100%",
    height: 150, // This acts as a max-height now
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden", // Important for containing the scaled view
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});
