// services/cachingService.ts

import { Directory, File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import Papa from 'papaparse';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = "@SymbolPickerRepoDirectoryUri";
const METADATA_HEADERS = ["timestamp", "search_query", "source", "symbol_name", "symbol_id", "original_url", "saved_path", "filename"];
const COMBINED_METADATA_HEADERS = ["timestamp", "filename", "saved_path", "combination_type", "component_symbols"];

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

export const cacheApiResults = async (results, sourceName, searchQuery, repoDir: Directory) => {
  if (Platform.OS === 'web' || !results || results.length === 0 || !repoDir) return;

  try {
    const dirAndFile = await getOrCreateMetadataFileForSource(repoDir, sourceName);
    if (!dirAndFile) return;
    const { metadataFile, sourceDir } = dirAndFile;

    // --- UPDATED FILE WRITING LOGIC ---
    // 1. Read existing data, treating the first row as a header
    let oldData = [];
    try {
      const oldCsvString = await FileSystemLegacy.readAsStringAsync(metadataFile.uri);
      if (oldCsvString) {
        // 'header: true' will parse into an array of objects
        const parsed = Papa.parse(oldCsvString, { header: true, skipEmptyLines: true });
        oldData = parsed.data || [];
      }
    } catch (readError) {
      console.log(`Metadata file for ${sourceName} is new or empty.`);
    }

    const newMetadataRows = [];
    for (const result of results) {
      const { id, name, imageUrl } = result.item;
      try {
        const fileExtension = imageUrl.includes('.svg') ? 'svg' : (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') ? 'jpg' : 'png');
        const safeName = (name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
        const finalFilename = `${safeName}_${id}.${fileExtension}`;

        const fileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(sourceDir.uri, finalFilename, `image/${fileExtension}`);
        
        const response = await fetch(imageUrl);
        const base64Data = await response.blob().then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        })) as string;

        await FileSystemLegacy.writeAsStringAsync(fileUri, base64Data, { encoding: 'base64' });
        
        // Create new rows as an ARRAY OF OBJECTS
        newMetadataRows.push({
          timestamp: new Date().toISOString(),
          search_query: searchQuery,
          source: sourceName,
          symbol_name: name,
          symbol_id: id,
          original_url: imageUrl,
          saved_path: fileUri,
          filename: finalFilename
        });
      } catch (e) {
        if (!e.message.includes('file already exists')) {
            console.error(`Failed to download/save symbol: ${name}`, e);
        }
      }
    }

    if (newMetadataRows.length > 0) {
      const combinedData = [...oldData, ...newMetadataRows];
      
      // Convert to CSV (with headers) and overwrite the entire file
      const finalCsvString = Papa.unparse(combinedData, {
        header: true,
        columns: METADATA_HEADERS // Ensures consistent column order
      });

      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, finalCsvString, { encoding: 'utf8' });
    }
  } catch (e) {
    Alert.alert("Cache Error", `Failed to save symbols. ${e.message}`);
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

export const saveSingleApiSymbol = async (
    repoDir: Directory,
    item: { id: any; name: string; imageUrl: string },
    sourceName: string
  ): Promise<{ fileUri: string; filename: string } | null> => {
    try {
      const dirAndFile = await getOrCreateMetadataFileForSource(repoDir, sourceName);
      if (!dirAndFile) throw new Error(`Could not get or create metadata file for ${sourceName}.`);
      const { metadataFile, sourceDir } = dirAndFile;

      const fileExtension = item.imageUrl.includes('.svg') ? 'svg' : (item.imageUrl.includes('.jpg') || item.imageUrl.includes('.jpeg') ? 'jpg' : 'png');
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
      
      // --- UPDATED FILE WRITING LOGIC ---
      let oldData = [];
      try {
        const oldCsvString = await FileSystemLegacy.readAsStringAsync(metadataFile.uri);
        if (oldCsvString) {
          const parsed = Papa.parse(oldCsvString, { header: true, skipEmptyLines: true });
          oldData = parsed.data || [];
        }
      } catch (readError) {
        console.log(`Metadata file for ${sourceName} is new or empty.`);
      }

      const newMetadataRow = {
          timestamp: new Date().toISOString(),  
          search_query: 'single_selection',  
          source: sourceName,  
          symbol_name: item.name,  
          symbol_id: item.id,  
          original_url: item.imageUrl,  
          saved_path: fileUri, 
          filename: finalFilename  
      };
      const combinedData = [...oldData, newMetadataRow];

      const finalCsvString = Papa.unparse(combinedData, { 
        header: true,
        columns: METADATA_HEADERS
      });
      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, finalCsvString, { encoding: 'utf8' });
   
      return { fileUri: fileUri, filename: finalFilename };
    } catch (e) {
      if (!e.message.includes('file already exists')) {
        console.error(`Failed to save single API symbol: ${item.name}`, e);
        Alert.alert("Save Error", `Could not save the symbol for ${item.name}.`);
      } else {
        const safeName = (item.name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
        const fileExtension = item.imageUrl.includes('.svg') ? 'svg' : (item.imageUrl.includes('.jpg') || item.imageUrl.includes('.jpeg') ? 'jpg' : 'png');
        const finalFilename = `${safeName}_${item.id}.${fileExtension}`;
        const dirContents = await FileSystemLegacy.StorageAccessFramework.readDirectoryAsync(dirAndFile.sourceDir.uri);
        const existingUri = dirContents.find(uri => decodeURIComponent(uri).endsWith(`/${finalFilename}`));
        if (existingUri) {
          return { fileUri: existingUri, filename: finalFilename };
        }
      }
      return null;
    }
  };

export const autoSaveDeck = async (deckData: any[], deckName: string): Promise<void> => {
  if (Platform.OS === 'web' || !deckData || deckData.length === 0 || !deckName) {
    return;
  }
  try {
    const repoDir = await getRepositoryDirectory();
    if (!repoDir) {
      console.log("Auto-save failed: Repository directory not selected.");
      return;
    }
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

export const saveTextSymbol = (repoDir: Directory, base64Data: string, symbolName: string) => 
    saveDataWithSAF(repoDir, "Custom Text", base64Data, symbolName);

export const saveCombinedSymbolAndMetadata = async (
    repoDir: Directory,
    base64Data: string,
    symbolName: string,
    selection: any[],
    isOrType: boolean
  ): Promise<{ fileUri: string; filename: string } | null> => {
    // First, save the combined image file to the 'Combined' directory
    const savedFile = await saveDataWithSAF(repoDir, "Combined", base64Data, symbolName);
  
    if (!savedFile) {
      // If saving the image failed, stop here
      return null;
    }
  
    try {
      // Now, get or create the metadata file for combined symbols
      const dirAndFile = await getOrCreateMetadataFileForSource(repoDir, "Combined");
      if (!dirAndFile) throw new Error("Could not get or create metadata file for Combined symbols.");
      
      const { metadataFile } = dirAndFile;
  
      // Read any existing data from the metadata CSV
      let oldData = [];
      try {
        const oldCsvString = await FileSystemLegacy.readAsStringAsync(metadataFile.uri);
        if (oldCsvString) {
          const parsed = Papa.parse(oldCsvString, { header: true, skipEmptyLines: true });
          oldData = parsed.data || [];
        }
      } catch (readError) {
        console.log("Combined metadata file is new or empty.");
      }
  
      // Prepare the new row for the metadata file
      const newMetadataRow = {
        timestamp: new Date().toISOString(),
        filename: savedFile.filename,
        saved_path: savedFile.fileUri,
        combination_type: isOrType ? 'or' : 'and',
        // Store the component symbols as a JSON string for easy parsing later
        component_symbols: JSON.stringify(
          selection.map(s => ({
            name: s.name,
            source: s.sourceName,
            filename: s.filename,
            id: s.id,
          }))
        ),
      };
  
      const combinedData = [...oldData, newMetadataRow];
  
      // Write the updated data back to the metadata CSV, including headers
      const finalCsvString = Papa.unparse(combinedData, {
        header: true,
        columns: COMBINED_METADATA_HEADERS,
      });
  
      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, finalCsvString, { encoding: 'utf8' });
  
      // Return the saved file info to be used in the picker
      return savedFile;
  
    } catch (e) {
      console.error("Failed to save combined symbol metadata:", e);
      Alert.alert("Metadata Error", `Could not save the metadata for the combined symbol. ${e.message}`);
      // Even if metadata fails, the file was saved, so we return its info
      return savedFile;
    }
  };