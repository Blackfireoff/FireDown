import os
import sys
import zipfile
import shutil
import urllib.request
from pathlib import Path

def download_ffmpeg():
    # Créer le dossier ffmpeg s'il n'existe pas
    ffmpeg_dir = Path(__file__).parent / "ffmpeg"
    if not ffmpeg_dir.exists():
        ffmpeg_dir.mkdir(parents=True)

    # URL de FFmpeg pour Windows
    ffmpeg_url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    zip_path = ffmpeg_dir / "ffmpeg.zip"

    print("Téléchargement de FFmpeg...")
    urllib.request.urlretrieve(ffmpeg_url, zip_path)

    print("Extraction de FFmpeg...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(ffmpeg_dir)

    # Déplacer les fichiers du dossier extrait vers le bon emplacement
    extracted_dir = next(ffmpeg_dir.glob("ffmpeg-master-*"))
    bin_dir = ffmpeg_dir / "bin"
    
    if bin_dir.exists():
        shutil.rmtree(bin_dir)
    
    shutil.move(str(extracted_dir / "bin"), str(bin_dir))
    shutil.rmtree(str(extracted_dir))
    os.remove(zip_path)

    print("FFmpeg a été installé avec succès!")

if __name__ == "__main__":
    download_ffmpeg() 