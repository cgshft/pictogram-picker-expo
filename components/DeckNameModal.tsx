// components/DeckNameModal.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

type DeckNameModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

const DeckNameModal: React.FC<DeckNameModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [deckName, setDeckName] = useState("");

  const handleSave = () => {
    if (deckName.trim()) {
      onSave(deckName.trim());
      setDeckName(""); // Reset for next time
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Name Your New Deck</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Core Vocabulary"
            placeholderTextColor="#888"
            value={deckName}
            onChangeText={setDeckName}
            autoFocus={true}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                !deckName.trim() && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!deckName.trim()}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalView: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "#2C2C2E",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#333",
    color: "white",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 25,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    flex: 1,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#555",
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: "#444",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DeckNameModal;