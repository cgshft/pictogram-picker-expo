import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Svg, Image as SvgImage, Text as SvgText } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as FileSystem from "expo-file-system/legacy";

const IMG_SIZE = 512;
const SEPARATOR_WIDTH = 250;

interface CombinePreviewModalProps {
  visible: boolean;
  selection: any[];
  isOrType: boolean;
  onClose: () => void;
  onSave: (result: { base64Data: string; combinedName: string }) => void;
}

const downloadImageToTemp = async (uri: string, index: number) => {
  if (!uri.startsWith("http")) {
    return uri;
  }
  const tempFileUri =
    FileSystem.cacheDirectory + `combine_temp_${index}_${Date.now()}.png`;
  const downloadResult = await FileSystem.downloadAsync(uri, tempFileUri);
  return downloadResult.uri;
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
          const localUris = await Promise.all(
            selection.map((item, index) =>
              downloadImageToTemp(item.imageUrl, index)
            )
          );
          const base64Sources = await Promise.all(
            localUris.map((uri) =>
              FileSystem.readAsStringAsync(uri, { encoding: "base64" })
            )
          );
          setImageSources(base64Sources);
        } catch (error) {
          console.error("Error loading images for combination:", error);
          Alert.alert(
            "Error",
            "Could not load one or more images for combining."
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

  const scale =
    previewContainerWidth > 0 && totalWidth > previewContainerWidth
      ? (previewContainerWidth - 20) / totalWidth
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

                              dy={90}
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fontSize={250}
                              fill="black"
                              fontFamily="sans-serif"
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
    height: 150,
    backgroundColor: "#1C1C1E",
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});
