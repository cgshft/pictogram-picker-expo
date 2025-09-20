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
  Switch,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import Slider from "@react-native-community/slider";
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
  const [fontSize, setFontSize] = useState(250);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);

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
  }, [visible, text, fontSize, isBold, isItalic]);

  const handleSave = () => {
    if (base64Data && symbolName.trim()) {
      onSave({ base64Data, symbolName: symbolName.trim() });
    }
  };

  const createHtmlContent = (
    character: string,
    size: number,
    bold: boolean,
    italic: boolean
  ) => `
    <!DOCTYPE html><html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <style>body, html { margin:0; padding:0; display:flex; align-items:center; justify-content:center; background-color:white; }</style>
    </head><body>
    <svg id="symbol-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
      <text 
        x="50%" 
        y="50%" 
        dominant-baseline="middle" 
        text-anchor="middle" 
        font-family="sans-serif"
        font-size="${size}px"
        font-weight="${bold ? "bold" : "normal"}"
        font-style="${italic ? "italic" : "normal"}"
        fill="black"
      >${character}</text>
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
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
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
          source={{ html: createHtmlContent(text, fontSize, isBold, isItalic) }}
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

              <View style={styles.controlsContainer}>
                <Text style={styles.label}>Font Size:</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={{ flex: 1, height: 40 }}
                    minimumValue={50}
                    maximumValue={400}
                    step={1}
                    value={fontSize}
                    onValueChange={setFontSize}
                    minimumTrackTintColor="#007AFF"
                    maximumTrackTintColor="#555"
                  />
                  <TextInput
                    style={styles.sizeInput}
                    value={String(Math.round(fontSize))}
                    onChangeText={(val) => setFontSize(Number(val) || 0)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.toggleContainer}>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Bold</Text>
                    <Switch value={isBold} onValueChange={setIsBold} />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Italic</Text>
                    <Switch value={isItalic} onValueChange={setIsItalic} />
                  </View>
                </View>
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingBottom: 350,
  },
  modalView: {
    margin: 20,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    width: "90%",
    maxWidth: 500,
    height: 600
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "white",
  },
  previewContainer: {
    width: 256,
    height: 256,
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    width: "100%",
    marginBottom: 0,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  sizeInput: {
    backgroundColor: "#333",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 16,
    width: 60,
    textAlign: "center",
    marginLeft: 10,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    alignSelf: "flex-start",
    marginBottom: 5,
    color: "#ccc",
    marginRight: 10,
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