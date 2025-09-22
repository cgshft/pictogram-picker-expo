import pandas as pd
import shutil
import os
import json

def collect_local_symbols(csv_path, dev_repo_root, output_dir):
    """
    Collects local symbol images based on an exported CSV.

    Args:
        csv_path (str): Path to the exported deck CSV file.
        dev_repo_root (str): Path to the root of your local development repository.
        output_dir (str): Path to the directory where collected images will be saved.
    """
    
    # --- FIX: Updated folder names to match your local repository ---
    source_to_local_path = {
        "Mulberry": os.path.join(dev_repo_root, "assets", "mulberry-symbols", "EN-symbols"),
        "OpenMoji": os.path.join(dev_repo_root, "assets", "openmoji-618x618-color", "emojis"),
        "Picom": os.path.join(dev_repo_root, "assets", "picom-symbols", "picom-og-symbols"),
        "Sclera": os.path.join(dev_repo_root, "assets", "sclera-symbols"),
        "Bliss": os.path.join(dev_repo_root, "assets", "bliss-png"),
        "Noto Emoji": os.path.join(dev_repo_root, "assets", "noto-emoji"),
    }

    # Ensure output directory existspicom-symbols
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Use a more robust CSV reading method to handle potential parsing errors
        df = pd.read_csv(csv_path, on_bad_lines='warn')
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    print(f"Processing {len(df)} entries from CSV...")
    copied_count = 0

    for index, row in df.iterrows():
        source = row.get("symbol_source")
        # The CSV might have a 'folder_name' column; prioritize it.
        folder_name_from_csv = row.get("folder_name")
        filename = row.get("symbol_filename")
        symbol_name = row.get("symbol_name")

        if pd.isna(source) or pd.isna(filename):
            continue

        if source in source_to_local_path:
            source_dir = source_to_local_path[source]
            
            source_file_path = os.path.join(source_dir, filename)
            # Prepend the source to the filename to avoid name collisions in the output folder
            destination_filename = f"{source}_{filename}"
            destination_file_path = os.path.join(output_dir, destination_filename)

            if os.path.exists(source_file_path):
                try:
                    shutil.copy2(source_file_path, destination_file_path)
                    copied_count += 1
                    print(f"Copied '{filename}' (Source: {source}, Symbol: {symbol_name})")
                except Exception as e:
                    print(f"Error copying {source_file_path}: {e}")
            else:
                print(f"Warning: Local file not found at '{source_file_path}' (Symbol: {symbol_name})")
    
    print(f"\nFinished collecting local symbols. Total copied: {copied_count}")
    print(f"Images saved to: {output_dir}")

if __name__ == "__main__":
    print("--- Local Symbol Collector ---")
    
    csv_input_path = input("Enter the path to your exported deck CSV file: ").strip()
    repo_root_input = input("Enter the path to your local development repository root: ").strip()
    output_dir_input = input("Enter the desired output directory for collected images: ").strip()

    collect_local_symbols(csv_input_path, repo_root_input, output_dir_input)