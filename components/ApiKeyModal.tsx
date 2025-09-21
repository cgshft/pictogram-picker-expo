import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

interface ApiKeyModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export default function ApiKeyModal({
  visible,
  onClose,
  onSave,
}: ApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState("");

  const handleSave = () => {
    if (keyInput.trim()) {
      onSave(keyInput.trim());
    } else {
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Enter Flaticon API Key</Text>
            <Text style={styles.modalSubtext}>
              Your key will be stored securely on your device.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Paste your API key here..."
              placeholderTextColor="#888"
              value={keyInput}
              onChangeText={setKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={onClose} color="#888" />
              <View style={{ width: 20 }} />
              <Button title="Save Key" onPress={handleSave} />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalView: {
    margin: 20,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    width: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "white",
  },
  modalSubtext: {
    fontSize: 14,
    color: "#AEAEB2",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#3A3A3C",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 25,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
  },
});
