// services/cachingService.ts

import { Directory, File, Paths } from 'expo-file-system';
import Papa from 'papaparse';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const METADATA_CSV_FILENAME = "api_symbol_metadata.csv";
const STORAGE_KEY = "@SymbolPickerRepoDirectoryUri";

// This variable will cache the file handle in memory for the app session.
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
  // If we already have the file handle from this session, return it immediately.
  if (metadataFileHandle) {
    return metadataFileHandle;
  }

  try {
    const contents = await repoDir.list();
    let metadataFile = contents.find(item => item.name === METADATA_CSV_FILENAME && item instanceof File) as File;

    if (!metadataFile) {
      const conflictingDir = contents.find(item => item.name === METADATA_CSV_FILENAME && item instanceof Directory);
      if (conflictingDir) {
        console.warn("Corrupted state: Deleting folder named 'api_symbol_metadata.csv'.");
        await conflictingDir.delete();
      }
      metadataFile = await repoDir.createFile(METADATA_CSV_FILENAME);
      const headers = Papa.unparse([{ timestamp: '', search_query: '', source: '', symbol_name: '', symbol_id: '', original_url: '', saved_path: '' }]);
      await metadataFile.write(headers);
      console.log("[Cache Service] Created and wrote new CSV header.");
    }
    
    // Store the valid file handle in our cache variable for next time.
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
    const repoContents = await repoDir.list();
    let sourceDir = repoContents.find(item => item.name === sourceName && item instanceof Directory) as Directory;
    if (!sourceDir) {
      sourceDir = await repoDir.createDirectory(sourceName);
    }
    
    const sourceDirContents = await sourceDir.list();
    const newMetadataRows = [];

    for (const result of results) {
      const { id, name, imageUrl } = result.item;
      
      try {
        // --- THIS IS THE NEW LOGIC ---

        // 1. Fetch the image and get the response headers
        const response = await fetch(imageUrl);
        if (!response.ok) {
          console.warn(`Skipping symbol '${name}' due to network error: ${response.status}`);
          continue;
        }

        // 2. Get the correct mimeType and determine the file extension from it
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        let fileExtension = 'png'; // Default
        if (contentType.includes('image/svg')) fileExtension = 'svg';
        else if (contentType.includes('image/png')) fileExtension = 'png';
        else if (contentType.includes('image/jpeg')) fileExtension = 'jpg';
        
        const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
        const localFilename = `${safeName}_${id}.${fileExtension}`;

        const alreadyExists = sourceDirContents.some(item => item.name === localFilename);
        if (alreadyExists) {
          continue;
        }
        
        // 3. Create the file, providing the correct mimeType
        const destinationFile = await sourceDir.createFile(localFilename, contentType);
        
        // 4. Write the file content
        const imageBytes = await response.arrayBuffer();
        await destinationFile.write(new Uint8Array(imageBytes));
        
        newMetadataRows.push({
          timestamp: new Date().toISOString(),
          search_query: searchQuery,
          source: sourceName,
          symbol_name: name,
          symbol_id: id,
          original_url: imageUrl,
          saved_path: destinationFile.uri,
        });

      } catch (e) {
        if (e.message.includes('exists')) {
          console.log(`Skipping existing symbol: ${name}`);
        } else {
          console.error(`Failed to download/save symbol: ${name}`, e);
        }
      }
    }

    if (newMetadataRows.length > 0) {
      const newCsvString = Papa.unparse(newMetadataRows, { header: false });
      const existingContent = await metadataFile.text();
      const finalContent = existingContent.trim() + '\n' + newCsvString;
      await metadataFile.write(finalContent);
      console.log(`Appended ${newMetadataRows.length} new rows to metadata CSV from ${sourceName}.`);
    }
  } catch (e) {
    console.error(`Failed to cache API results for ${sourceName}:`, e);
    Alert.alert("Cache Error", `Failed to save symbols. ${e.message}`);
  }
};