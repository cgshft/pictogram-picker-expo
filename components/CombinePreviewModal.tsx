import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";

const IMG_SIZE = 512;
const SEPARATOR_WIDTH = 250;
const SEPARATOR_TEXT = "||";

interface CombinePreviewModalProps {
  visible: boolean;
  selection: any[];
  isOrType: boolean;
  onClose: () => void;
  onSave: (result: { base64Data: string; combinedName: string }) => void;
}

// Helper to get a local file URI for an image asset
// FIX 1: Accept the index to guarantee a unique filename
const getLocalImageUri = async (item: any, index: number): Promise<string> => {
  if (item.localUri) return item.localUri;

  if (item.imageUrl) {
    // FIX 2: Add the index to the temporary filename
    const tempFileUri =
      FileSystem.cacheDirectory + `combine_remote_${index}_${Date.now()}.png`;
    try {
      const { uri } = await FileSystem.downloadAsync(
        item.imageUrl,
        tempFileUri
      );
      return uri;
    } catch (e) {
      console.error(`Failed to download ${item.imageUrl}`, e);
      throw e;
    }
  }

  if (item.imageResource) {
    const asset = Asset.fromModule(item.imageResource);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error("Asset has no local URI");
    return asset.localUri;
  }

  throw new Error(`No image source found for item ${item.name || "unknown"}`);
};

// Generates the HTML+JS needed to combine images on a canvas
const createCombineHtml = (
  base64Images: string[],
  isOrType: boolean
): string => {
  const numSeparators = isOrType ? Math.max(0, base64Images.length - 1) : 0;
  const totalWidth =
    base64Images.length * IMG_SIZE + numSeparators * SEPARATOR_WIDTH;
  const imagesJson = JSON.stringify(base64Images);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      </head>
      <body>
        <canvas id="canvas" width="${totalWidth}" height="${IMG_SIZE}" style="display: none;"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          const base64Sources = ${imagesJson};
          
          const loadImage = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

          Promise.all(base64Sources.map(src => loadImage('data:image/png;base64,' + src)))
            .then(images => {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              let xOffset = 0;
              images.forEach((img, index) => {
                ctx.drawImage(img, xOffset, 0, ${IMG_SIZE}, ${IMG_SIZE});
                xOffset += ${IMG_SIZE};
                if (${isOrType} && index < images.length - 1) {
                  ctx.fillStyle = 'black';
                  ctx.font = '250px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText("${SEPARATOR_TEXT}", xOffset + ${
    SEPARATOR_WIDTH / 2
  }, ${IMG_SIZE / 2});
                  xOffset += ${SEPARATOR_WIDTH};
                }
              });
              const finalBase64 = canvas.toDataURL('image/png').split(',')[1];
              window.ReactNativeWebView.postMessage(finalBase64);
            })
            .catch(error => {
              window.ReactNativeWebView.postMessage('ERROR: ' + error.message);
            });
        </script>
      </body>
    </html>
  `;
};

export default function CombinePreviewModal({
  visible,
  selection,
  isOrType,
  onClose,
  onSave,
}: CombinePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [combinedBase64, setCombinedBase64] = useState<string | null>(null);
  const [htmlToRender, setHtmlToRender] = useState<string | null>(null);

  useEffect(() => {
    if (visible && selection.length > 0) {
      const processImages = async () => {
        setIsLoading(true);
        setCombinedBase64(null);
        setHtmlToRender(null);
        try {
          // Pass the index to the helper function
          const uris = await Promise.all(
            selection.map((item, index) => getLocalImageUri(item, index))
          );
          const base64Sources = await Promise.all(
            uris.map((uri) =>
              FileSystem.readAsStringAsync(uri, {
                encoding: "base64",
              })
            )
          );
          setHtmlToRender(createCombineHtml(base64Sources, isOrType));
        } catch (error) {
          console.error("Error processing images for combination:", error);
          Alert.alert("Error", "Could not load images for combining.");
          onClose();
        }
      };
      processImages();
    }
  }, [visible, selection, isOrType]);

  const handleWebViewMessage = (event: any) => {
    const message = event.nativeEvent.data;
    if (message.startsWith("ERROR:")) {
      console.error("Error from WebView:", message);
      Alert.alert("Error", "Could not generate the combined image.");
      setIsLoading(false);
    } else {
      setCombinedBase64(message);
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (combinedBase64) {
      const combinedName = selection.map((s) => s.name).join(" / ");
      onSave({ base64Data: combinedBase64, combinedName });
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {htmlToRender && (
        <View style={{ width: 0, height: 0 }}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlToRender }}
            onMessage={handleWebViewMessage}
            onError={(e) => console.error("WebView Error:", e.nativeEvent)}
          />
        </View>
      )}
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Combine Symbols</Text>
          <View style={styles.previewContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" />
            ) : (
              combinedBase64 && (
                <Image
                  source={{ uri: `data:image/png;base64,${combinedBase64}` }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )
            )}
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Cancel" onPress={onClose} color="#888" />
            <View style={{ width: 20 }} />
            <Button
              title="Save Combination"
              onPress={handleSave}
              disabled={isLoading || !combinedBase64}
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
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});
