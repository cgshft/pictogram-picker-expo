// services/cachingService.ts

import { Directory, File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
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
        "Please create a folder (e.g., 'SymbolPickerRepo'), then select it."
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
    if (metadataFileHandle) return metadataFileHandle;
    try {
        const files = await FileSystemLegacy.StorageAccessFramework.readDirectoryAsync(repoDir.uri);
        const metadataFileUri = files.find(uri => uri.endsWith(METADATA_CSV_FILENAME));

        if (metadataFileUri) {
            metadataFileHandle = new File(metadataFileUri);
        } else {
            const newFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(repoDir.uri, METADATA_CSV_FILENAME, 'text/csv');
            const headers = Papa.unparse([{ timestamp: '', search_query: '', source: '', symbol_name: '', symbol_id: '', original_url: '', saved_path: '' }]);
            await FileSystemLegacy.writeAsStringAsync(newFileUri, headers, { encoding: 'utf8' });
            metadataFileHandle = new File(newFileUri);
        }
        return metadataFileHandle;
    } catch (e) {
        console.error('[Cache Service] CRITICAL ERROR in setupRepository:', e);
        Alert.alert("Permission Error", `Could not create necessary metadata files. Please try re-selecting the folder from the home screen to grant permissions again.`);
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

const saveDataWithSAF = async (
  repoDir: Directory,
  subdirectory: string,
  base64Data: string,
  symbolName: string
): Promise<{ fileUri: string; filename: string } | null> => {
  try {
    // **THE FIX**: First, ensure the subdirectory exists and get a reference to it.
    const repoContents = await repoDir.list();
    let destinationDir = repoContents.find(
      (item) => item.name === subdirectory && item instanceof Directory
    ) as Directory;

    if (!destinationDir) {
      destinationDir = await repoDir.createDirectory(subdirectory);
    }
    
    const safeName = symbolName.replace(/[^a-zA-Z0-9\s/]/g, '_').replace(/\s\/\s/g, '-');
    const finalFilename = `${safeName}_${Date.now()}.png`;
    
    // Create the file inside the correct subdirectory
    const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
      destinationDir.uri, // Use the subdirectory's URI
      finalFilename,      // Use just the filename
      'image/png'
    );

    await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });

    console.log(`Saved new symbol to: ${fileUri}`);
    // Return a filename that includes the subdirectory for the CSV log
    return { fileUri, filename: `${subdirectory}/${finalFilename}` };

  } catch (e) {
    console.error(`Failed to save symbol to ${subdirectory}:`, e);
    Alert.alert("Save Error", `Could not save the symbol. ${e.message}`);
    return null;
  }
};


export const saveTextSymbol = (repoDir: Directory, base64Data: string, symbolName: string) => 
    saveDataWithSAF(repoDir, "Custom Text", base64Data, symbolName);

export const saveCombinedSymbol = (repoDir: Directory, base64Data: string, symbolName: string) =>
    saveDataWithSAF(repoDir, "Combined", base64Data, symbolName);