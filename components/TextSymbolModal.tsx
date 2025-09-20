import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Button,
  ActivityIndicator,
  Image,
} from "react-native";
import { WebView } from "react-native-webview";
import unicodeProperties from "unicode-properties";

interface TextSymbolModalProps {
  visible: boolean;
  text: string;
  onClose: () => void;
  onSave: (result: { base64Data: string; symbolName: string }) => void;
}

export default function TextSymbolModal({
  visible,
  text,
  onClose,
  onSave,
}: TextSymbolModalProps) {
  const [symbolName, setSymbolName] = useState("");
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (text) {
      try {
        if (text.length > 1) {
          setSymbolName(text.replace(/\s/g, "_"));
          return;
        }
        const charCode = text.codePointAt(0);
        const name = unicodeProperties.getName(charCode);
        setSymbolName(name ? name.toLowerCase().replace(/\s/g, "_") : text);
      } catch (e) {
        setSymbolName(text);
      }
    }
  }, [text]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setBase64Data(null);
    }
  }, [visible]);

  const handleSave = () => {
    if (base64Data && symbolName.trim()) {
      onSave({ base64Data, symbolName: symbolName.trim() });
    }
  };

  const createHtmlContent = (character: string) => `
    <!DOCTYPE html><html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>body, html { margin:0; padding:0; display:flex; align-items:center; justify-content:center; background-color:white; }</style>
    </head><body>
    <svg id="symbol-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="250px" fill="black" font-family="sans-serif">${character}</text>
    </svg>
    <canvas id="canvas" width="512" height="512" style="display: none;"></canvas>
    <script>
      try {
        const svgElement = document.getElementById('symbol-svg');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();
        const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(svgBlob);
        img.onload = function() {
          // --- FIX: Fill the canvas with a white background first ---
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // --- Now draw the text on top of the white background ---
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          const dataUrl = canvas.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(dataUrl.split(',')[1]);
        };
        img.src = url;
      } catch (e) {
        window.ReactNativeWebView.postMessage("error");
      }
    </script>
    </body></html>
  `;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {visible && (
        <WebView
          style={{ width: 0, height: 0, position: "absolute" }}
          originWhitelist={["*"]}
          source={{ html: createHtmlContent(text) }}
          onMessage={(event) => {
            const message = event.nativeEvent.data;
            if (message !== "error") {
              setBase64Data(message);
            } else {
              alert("Failed to render symbol.");
            }
            setIsLoading(false);
          }}
        />
      )}

      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Create Text Symbol</Text>

          <View style={styles.previewContainer}>
            {isLoading && <ActivityIndicator size="large" />}
            {base64Data && (
              <Image
                style={{ width: "100%", height: "100%" }}
                source={{ uri: `data:image/png;base64,${base64Data}` }}
              />
            )}
          </View>

          <Text style={styles.label}>Symbol Name:</Text>
          <TextInput
            style={styles.input}
            value={symbolName}
            onChangeText={setSymbolName}
            placeholder="Enter a name for the symbol..."
          />

          <View style={styles.buttonContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Button title="Cancel" onPress={onClose} color="#888" />
                <View style={{ width: 20 }} />
                <Button
                  title="Save Symbol"
                  onPress={handleSave}
                  disabled={!base64Data}
                />
              </>
            )}
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
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "90%",
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "white",
  },
  previewContainer: {
    width: 256,
    height: 200,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    alignSelf: "flex-start",
    marginLeft: 10,
    marginBottom: 5,
    color: "#ccc",
  },
  input: {
    width: "100%",
    backgroundColor: "#333",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});
