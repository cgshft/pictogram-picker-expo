// services/cachingService.ts
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import Papa from 'papaparse';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const METADATA_CSV_FILENAME = "api_symbol_metadata.csv";
const STORAGE_KEY = "@SymbolPickerRepoDirectoryUri";

let metadataFileHandle: File | null = null;

export const getRepositoryDirectory = async (): Promise<Directory | null> => {
  try {
    const uri = await AsyncStorage.getItem(STORAGE_KEY);
    if (uri) {
      return new Directory(uri);
    } else {
      Alert.alert(
        "Select Repository Folder",
        "Please use your file manager to create a folder (e.g., 'SymbolPickerRepo'), then select that folder."
      );
      const repoDir = await Directory.pickDirectoryAsync();
      if (repoDir) {
        await AsyncStorage.setItem(STORAGE_KEY, repoDir.uri);
        return repoDir;
      }
    }
  } catch (e) {
    console.error("Failed to get/set repository directory:", e);
  }
  return null;
};

export const setupRepositoryAndGetFile = async (repoDir: Directory): Promise<File | null> => {
  if (metadataFileHandle) {
    return metadataFileHandle;
  }
  try {
    const contents = await repoDir.list();
    let metadataFile = contents.find(item => item.name === METADATA_CSV_FILENAME && item instanceof File) as File;

    if (!metadataFile) {
      const conflictingDir = contents.find(item => item.name === METADATA_CSV_FILENAME && item instanceof Directory);
      if (conflictingDir) {
        await conflictingDir.delete();
      }
      metadataFile = await repoDir.createFile(METADATA_CSV_FILENAME);
      const headers = Papa.unparse([{ timestamp: '', search_query: '', source: '', symbol_name: '', symbol_id: '', original_url: '', saved_path: '' }]);
      await metadataFile.write(headers);
    }
    metadataFileHandle = metadataFile;
    return metadataFileHandle;
  } catch (e) {
    console.error('[Cache Service] CRITICAL ERROR in setupRepository:', e);
    return null;
  }
};

export const cacheApiResults = async (results, sourceName, searchQuery, repoDir, metadataFile) => {
  if (Platform.OS === 'web' || !results || results.length === 0) return;
  if (!repoDir || !metadataFile) return;

  try {
    let sourceDir = (await repoDir.list()).find(item => item.name === sourceName && item instanceof Directory) as Directory;
    if (!sourceDir) {
      sourceDir = await repoDir.createDirectory(sourceName);
    }
    const sourceDirContents = await sourceDir.list();
    const newMetadataRows = [];

    for (const result of results) {
      const { id, name, imageUrl } = result.item;
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        let fileExtension = 'png';
        if (contentType.includes('image/svg')) fileExtension = 'svg';
        else if (contentType.includes('image/jpeg')) fileExtension = 'jpg';
        
        const safeName = (name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
        const localFilename = `${safeName}_${id}.${fileExtension}`;

        if (sourceDirContents.some(item => item.name === localFilename)) continue;
        
        const destinationFile = await sourceDir.createFile(localFilename, contentType);
        const imageBytes = await response.arrayBuffer();
        await destinationFile.write(new Uint8Array(imageBytes));
        
        newMetadataRows.push({
          timestamp: new Date().toISOString(), search_query: searchQuery, source: sourceName,
          symbol_name: name, symbol_id: id, original_url: imageUrl, saved_path: destinationFile.uri,
        });
      } catch (e) {
        console.error(`Failed to download/save symbol: ${name}`, e);
      }
    }

    if (newMetadataRows.length > 0) {
      const newCsvString = Papa.unparse(newMetadataRows, { header: false });
      const existingContent = await metadataFile.text();
      const finalContent = existingContent.trim() + '\n' + newCsvString;
      await metadataFile.write(finalContent);
    }
  } catch (e) {
    Alert.alert("Cache Error", `Failed to save symbols. ${e.message}`);
  }
};

export const saveTextSymbol = async (
  repoDir: Directory,
  base64Data: string,
  symbolName: string
): Promise<{ fileUri: string; filename: string } | null> => {
  if (!repoDir) return null;

  try {
    // Step 1: Ensure the destination subdirectory exists using the modern API.
    const repoContents = await repoDir.list();
    let destinationDir = repoContents.find(
      (item) => item.name === 'Custom Text' && item instanceof Directory
    ) as Directory;
    if (!destinationDir) {
      destinationDir = await repoDir.createDirectory('Custom Text');
    }

    // Step 2: Create a unique filename.
    const safeName = symbolName.replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `${safeName}_${Date.now()}.png`;

    // Step 3: Create an EMPTY placeholder file at the destination to get a valid, writable URI.
    const finalFile = await destinationDir.createFile(finalFilename, 'image/png');

    // Step 4: Write the base64 data directly to the placeholder file's URI using the legacy API.
    await FileSystem.writeAsStringAsync(finalFile.uri, base64Data, {
      encoding: 'base64',
    });

    console.log(`Saved new text symbol to: ${finalFile.uri}`);
    return { fileUri: finalFile.uri, filename: finalFilename };

  } catch (e) {
    console.error("Failed to save custom text symbol:", e);
    Alert.alert("Save Error", `Could not save the custom symbol. ${e.message}`);
    return null;
  }
};

export const saveCombinedSymbol = async (
  repoDir: Directory,
  base64Data: string,
  symbolName: string
): Promise<{ fileUri: string; filename: string } | null> => {
  if (!repoDir) return null;

  try {
    // Step 1: Ensure the destination subdirectory exists
    const repoContents = await repoDir.list();
    let destinationDir = repoContents.find(
      (item) => item.name === 'Combined' && item instanceof Directory
    ) as Directory;
    if (!destinationDir) {
      destinationDir = await repoDir.createDirectory('Combined');
    }

    // Step 2: Create a unique filename
    const safeName = symbolName.replace(/[^a-zA-Z0-9\s/]/g, '_').replace(/\s\/\s/g, '-');
    const finalFilename = `${safeName}_${Date.now()}.png`;

    // Step 3: Create an EMPTY placeholder file at the destination to get a valid URI
    const finalFile = await destinationDir.createFile(finalFilename, 'image/png');

    // Step 4: Write the base64 data directly to the placeholder file's URI
    await FileSystem.writeAsStringAsync(finalFile.uri, base64Data, {
      encoding: 'base64',
    });

    console.log(`Saved combined symbol to: ${finalFile.uri}`);
    return { fileUri: finalFile.uri, filename: finalFilename };

  } catch (e) {
    console.error("Failed to save combined symbol:", e);
    Alert.alert("Save Error", `Could not save the combined symbol. ${e.message}`);
    return null;
  }
};