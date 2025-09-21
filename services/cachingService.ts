import { Directory, File } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
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

// --- UPDATED HELPER: Now returns both the metadata file and its parent directory ---
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
    const existingFileUri = sourceDirFiles.find(uri => uri.endsWith(metadataFilename));

    let finalFileUri: string;

    if (existingFileUri) {
      finalFileUri = existingFileUri;
    } else {
      finalFileUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        sourceDir.uri,
        metadataFilename,
        'text/csv'
      );
      const headers = Papa.unparse([{ timestamp: '', search_query: '', source: '', symbol_name: '', symbol_id: '', original_url: '', saved_path: '' }]);
      await FileSystemLegacy.writeAsStringAsync(finalFileUri, headers, { encoding: 'utf8' });
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
    if (!dirAndFile) { return; }
    const { metadataFile, sourceDir } = dirAndFile; // Use the returned sourceDir

    const newMetadataRows = [];

    for (const result of results) {
      const { id, name, imageUrl } = result.item;
      try {
        let fileExtension = 'png';
        if (imageUrl.includes('.svg')) fileExtension = 'svg';
        else if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) fileExtension = 'jpg';
        
        const safeName = (name || 'untitled').replace(/[^a-zA-Z0-9]/g, '_');
        const finalFilename = `${safeName}_${id}.${fileExtension}`;

        // Create the image file in the correct subdirectory
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
        });
      } catch (e) {
        if (!e.message.includes('file already exists')) {
            console.error(`Failed to download/save symbol: ${name}`, e);
        }
      }
    }

    if (newMetadataRows.length > 0) {
      const newCsvString = Papa.unparse(newMetadataRows, { header: false });
      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, `\n${newCsvString}`, { encoding: 'utf8', append: true });
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
    return { fileUri, filename: `${subdirectory}/${finalFilename}` };
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
      const { metadataFile, sourceDir } = dirAndFile; // Use the returned sourceDir

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

      const newMetadataRow = [{ timestamp: new Date().toISOString(), search_query: 'single_selection', source: sourceName, symbol_name: item.name, symbol_id: item.id, original_url: item.imageUrl, saved_path: fileUri }];
      const newCsvString = Papa.unparse(newMetadataRow, { header: false });
      await FileSystemLegacy.writeAsStringAsync(metadataFile.uri, `\n${newCsvString}`, { encoding: 'utf8', append: true });
  
      return { fileUri: fileUri, filename: `${sourceName}/${finalFilename}` };
  
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