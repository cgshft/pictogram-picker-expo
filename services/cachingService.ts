// services/cachingService.ts

import { Directory, File } from 'expo-file-system';
import * as FileSystemLegacy    from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = "@SymbolPickerRepoDirectoryUri";

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

export const cacheApiResults = async (results, sourceName, searchQuery, repoDir: Directory) => {
  if (Platform.OS === 'web' || !results || results.length === 0 || !repoDir) return;

  try {
    const dirAndFile = await getOrCreateMetadataFileForSource(repoDir, sourceName);
    if (!dirAndFile) { return; }
    // Deconstruct the return object to get the reliable sourceDir
    const { metadataFile, sourceDir } = dirAndFile;

    const newMetadataRows = [];

    for (const result of results) {
      const { id, name, imageUrl } = result.item;
      try {
        let fileExtension = 'png';
        if (imageUrl.includes('.svg')) fileExtension = 'svg';
        else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) fileExtension = 'jpg';
        
        const safeName = (name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
        const finalFilename = `${safeName}_${id}.${fileExtension}`;

        // FIX: Use the reliable sourceDir.uri to save the image file
        const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(sourceDir.uri, finalFilename, `image/${fileExtension}`);
        
        const response = await fetch(imageUrl);
        const base64Data = await response.blob().then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        })) as string;

        await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });
        
        newMetadataRows.push({
          timestamp: new Date().toISOString(), search_query: searchQuery, source: sourceName,
          symbol_name: name, symbol_id: id, original_url: imageUrl, saved_path: fileUri,
          filename: finalFilename
        });
      } catch (e) {
        if (!e.message.includes('file already exists')) {
            console.error(`Failed to download/save symbol: ${name}`, e);
        }
      }
    }

    if (newMetadataRows.length > 0) {
      const newCsvString = Papa.unparse(newMetadataRows, { header: false });
      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, newCsvString + '\n', { encoding: 'utf8', append: true });
    }
  } catch (e) {
    Alert.alert("Cache Error", `Failed to save symbols. ${e.message}`);
  }
};

/**
 * Auto-saves the entire deck data to a CSV file in the root of the repository directory.
 * This function overwrites the file on each call to ensure it's always up-to-date.
 * @param deckData The array of deck data objects.
 * @param deckName The name of the deck, used for the filename.
 */
export const autoSaveDeck = async (deckData: any[], deckName: string): Promise<void> => {
  // Don't run on web or if there's no data/name to save
  if (Platform.OS === 'web' || !deckData || deckData.length === 0 || !deckName) {
    return;
  }

  try {
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) {
      console.log("Auto-save failed: Repository directory not selected.");
      return;
    }

    // --- FIX: Sanitize the name but preserve the period for the file extension ---
    // This removes the "_deck_" prefix and keeps the ".csv" from the original name.
    const filename = deckName.replace(/[^a-zA-Z0-9.]/g, '_');

    const csvString = Papa.unparse(deckData);

    const dirContentsUris = await FileSystemLegacy.StorageAccessFramework.readDirectoryAsync(repoDir.uri);

    let fileUri = dirContentsUris.find(uri => decodeURIComponent(uri).endsWith(`/${filename}`));

    if (!fileUri) {
      fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        repoDir.uri,
        filename,
        'text/csv'
      );
    }

    await FileSystemLegacy.writeAsStringAsync(fileUri, csvString, { encoding: 'utf8' });

  } catch (e) {
    console.error("Failed to auto-save deck:", e);
  }
};

export const saveSingleApiSymbol = async (
  repoDir: Directory,
  item: { id: any; name: string; imageUrl: string },
  sourceName: string
): Promise<{ fileUri: string; filename: string } | null> => {
  try {
    const dirAndFile = await getOrCreateMetadataFileForSource(repoDir, sourceName);
    if (!dirAndFile) throw new Error(`Could not get or create metadata file for ${sourceName}.`);
    const { metadataFile, sourceDir } = dirAndFile;

    let fileExtension = 'png';
    if (item.imageUrl.includes('.svg')) fileExtension = 'svg';
    else if (item.imageUrl.includes('.jpg') || item.imageUrl.includes('.jpeg')) fileExtension = 'jpg';
     
    const safeName = (item.name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `${safeName}_${item.id}.${fileExtension}`;

    const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(sourceDir.uri, finalFilename, `image/${fileExtension}`);

    const response = await fetch(item.imageUrl);
    const base64Data = await response.blob().then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    })) as string;

    await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });

    const newMetadataRow = [{ 
        timestamp: new Date().toISOString(), 
        search_query: 'single_selection', 
        source: sourceName, 
        symbol_name: item.name, 
        symbol_id: item.id, 
        original_url: item.imageUrl, 
        saved_path: fileUri,
        filename: finalFilename 
      }];
    const newCsvString = Papa.unparse(newMetadataRow, { header: false });
    await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, newCsvString + '\n', { encoding: 'utf8', append: true });

    return { fileUri: fileUri, filename: finalFilename };

  } catch (e) {
    if (!e.message.includes('file already exists')) {
      console.error(`Failed to save single API symbol: ${item.name}`, e);
      Alert.alert("Save Error", `Could not save the symbol for ${item.name}.`);
    }
    return null;
  }
};


export const saveTextSymbol = (repoDir: Directory, base64Data: string, symbolName: string) => 
    saveDataWithSAF(repoDir, "Custom Text", base64Data, symbolName);

export const saveCombinedSymbol = (repoDir: Directory, base64Data: string, symbolName: string) =>
  saveDataWithSAF(repoDir, "Combined", base64Data, symbolName);

// This helper now returns BOTH the metadata file and its parent source directory
const getOrCreateMetadataFileForSource = async (
  repoDir: Directory,
  sourceName: string
): Promise<{ metadataFile: File; sourceDir: Directory } | null> => {
  try {
    const repoContents = await repoDir.list();
    let sourceDir = repoContents.find(
      (item) => item.name === sourceName && item instanceof Directory
    ) as Directory;
    if (!sourceDir) {
      sourceDir = await repoDir.createDirectory(sourceName);
    }

    const metadataFilename = `_${sourceName}_metadata.csv`;
    const sourceDirFiles = await FileSystemLegacy.StorageAccessFramework.readDirectoryAsync(sourceDir.uri);
    
    // FIX: Decode URI component to reliably find the existing file.
    const existingFileUri = sourceDirFiles.find(uri => decodeURIComponent(uri).endsWith(`/${metadataFilename}`));

    let finalFileUri: string;

    if (existingFileUri) {
      finalFileUri = existingFileUri;
    } else {
      finalFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        sourceDir.uri,
        metadataFilename,
        'text/csv'
      );
    }
    
    return { metadataFile: new File(finalFileUri), sourceDir };

  } catch (e) {
    console.error(`Error setting up metadata for ${sourceName}:`, e);
    Alert.alert("Metadata Error", `Could not create or access metadata file for ${sourceName}.`);
    return null;
  }
};



const saveDataWithSAF = async ( repoDir: Directory, subdirectory: string, base64Data: string, symbolName: string ): Promise<{ fileUri: string; filename: string } | null> => {
  try {
    const repoContents = await repoDir.list();
    let destinationDir = repoContents.find(
      (item) => item.name === subdirectory && item instanceof Directory
    ) as Directory;

    if (!destinationDir) {
      destinationDir = await repoDir.createDirectory(subdirectory);
    }
    
    const safeName = symbolName.replace(/[^a-zA-Z0-9\s/]/g, '_').replace(/\s\/\s/g, '-');
    const finalFilename = `${safeName}_${Date.now()}.png`;
    
    const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
      destinationDir.uri,
      finalFilename,
      'image/png'
    );

    await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });
    return { fileUri, filename: finalFilename };
  } catch (e) {
    console.error(`Failed to save symbol to ${subdirectory}:`, e);
    Alert.alert("Save Error", `Could not save the symbol. ${e.message}`);
    return null;
  }
};