from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import yt_dlp
import os
import shutil
import zipfile
from typing import Optional
import asyncio
import uuid
import time

app = FastAPI()

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Création du dossier pour les téléchargements
DOWNLOAD_DIR = "downloads"
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

class DownloadRequest(BaseModel):
    url: str
    format: str
    quality: str
    fileFormat: str

class DownloadProgress:
    def __init__(self):
        self.progress = 0
        self.title = ""
        self.filename = ""
        self.is_playlist = False
        self.playlist_items = []

current_downloads = {}

def get_format_selection(format_type: str, quality: str, file_format: str) -> str:
    if format_type == "audio":
        return "bestaudio/best"  # On laisse le post-processeur gérer la conversion audio
    
    # Video format selection
    quality_filter = ""
    if quality == "medium":
        quality_filter = "[height<=720]"
    elif quality == "lowest":
        quality_filter = "[height<=480]"

    if file_format in ['mp4', 'webm']:
        return f"bestvideo[ext={file_format}]{quality_filter}+bestaudio[ext={file_format}]/best[ext={file_format}]{quality_filter}/best"
    else:
        # Pour les autres formats, on prend le meilleur format disponible et on convertit après
        return f"bestvideo{quality_filter}+bestaudio/best{quality_filter}/best"

def progress_hook(d, download_id):
    if d['status'] == 'downloading':
        if 'total_bytes' in d and 'downloaded_bytes' in d:
            progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
        elif 'total_bytes_estimate' in d and 'downloaded_bytes' in d:
            progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
        else:
            progress = 0
            
        if download_id in current_downloads:
            current_downloads[download_id].progress = progress
    elif d['status'] == 'finished':
        if download_id in current_downloads:
            # Ne pas définir le nom de fichier ici, attendre la fin de la conversion
            current_downloads[download_id].progress = 99  # On garde 1% pour la conversion

async def wait_for_file(file_path: str, timeout: int = 60):
    """Attend que le fichier existe et ne soit plus en cours d'écriture."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if os.path.exists(file_path):
            try:
                # Vérifie si le fichier est accessible et complet
                with open(file_path, 'rb') as f:
                    # Si on peut lire le fichier et qu'il a une taille > 0
                    if os.path.getsize(file_path) > 0:
                        return True
            except (IOError, PermissionError):
                pass
        await asyncio.sleep(1)
    return False

def get_final_filename(original_filename: str, format_type: str, file_format: str) -> str:
    base_name = os.path.splitext(original_filename)[0]
    return f"{base_name}.{file_format}"

async def download_video(url: str, format_type: str, quality: str, file_format: str, download_id: str):
    download_progress = DownloadProgress()
    current_downloads[download_id] = download_progress

    # Créer un dossier unique pour ce téléchargement
    download_folder = os.path.join(DOWNLOAD_DIR, f"download_{download_id}")
    os.makedirs(download_folder, exist_ok=True)

    # Chemin vers FFmpeg
    ffmpeg_location = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg", "bin")
    
    ydl_opts = {
        'format': get_format_selection(format_type, quality, file_format),
        'outtmpl': os.path.join(download_folder, f'%(title)s.%(ext)s'),
        'progress_hooks': [lambda d: progress_hook(d, download_id)],
        'no_check_certificates': True,
        'nocheckcertificate': True,
        'ignoreerrors': True,
        'no_warnings': True,
        'quiet': True,
        'extract_flat': False,
        'extractor_retries': 3,
        'file_access_retries': 3,
        'fragment_retries': 3,
        'skip_download': False,
        'rm_cachedir': True,
        'ffmpeg_location': ffmpeg_location,
        'retries': 10,
    }

    if format_type == "audio":
        ydl_opts.update({
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': file_format,
                'preferredquality': '192',
            }],
            'extractaudio': True,
            'format': 'bestaudio/best',
        })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                if info is None:
                    raise Exception("Impossible d'extraire les informations de la vidéo")
            except Exception as e:
                print(f"Erreur lors de l'extraction des informations : {str(e)}")
                shutil.rmtree(download_folder)
                raise HTTPException(status_code=500, detail=str(e))

            info = ydl.extract_info(url, download=True)
            
            if 'entries' in info:  # C'est une playlist
                download_progress.is_playlist = True
                
                # Créer le fichier ZIP directement dans le dossier downloads
                zip_filename = f"playlist_{download_id}.zip"
                zip_path = os.path.join(DOWNLOAD_DIR, zip_filename)
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    for root, dirs, files in os.walk(download_folder):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, download_folder)
                            zipf.write(file_path, arcname)
                
                # Nettoyer le dossier temporaire
                shutil.rmtree(download_folder)
                download_progress.filename = zip_filename
            else:
                # Obtenir le nom de fichier préparé
                files = os.listdir(download_folder)
                if not files:
                    raise HTTPException(status_code=500, detail="Le fichier n'a pas pu être téléchargé")
                
                downloaded_file = os.path.join(download_folder, files[0])
                base_name = os.path.splitext(downloaded_file)[0]

                # Si c'est une vidéo et qu'on veut un format autre que mp4/webm
                if format_type == "video" and file_format not in ['mp4', 'webm']:
                    final_filename = f"{os.path.basename(base_name)}.{file_format}"
                    final_path = os.path.join(DOWNLOAD_DIR, final_filename)
                    
                    # Convertir la vidéo avec FFmpeg
                    try:
                        import subprocess
                        cmd = [
                            os.path.join(ffmpeg_location, 'ffmpeg'),
                            '-i', downloaded_file,
                            '-c:v', 'libx264' if file_format == 'avi' else 'copy',
                            '-c:a', 'aac',
                            final_path
                        ]
                        subprocess.run(cmd, check=True)
                    except subprocess.CalledProcessError as e:
                        print(f"Erreur FFmpeg: {e}")
                        # Si la conversion échoue, on garde le fichier original
                        final_path = os.path.join(DOWNLOAD_DIR, os.path.basename(downloaded_file))
                        shutil.copy2(downloaded_file, final_path)
                        final_filename = os.path.basename(downloaded_file)
                else:
                    final_filename = os.path.basename(downloaded_file)
                    final_path = os.path.join(DOWNLOAD_DIR, final_filename)
                    shutil.copy2(downloaded_file, final_path)

                # Nettoyer le dossier temporaire
                shutil.rmtree(download_folder)
                download_progress.filename = final_filename

            download_progress.title = info.get('title', '')
            download_progress.progress = 100
            
    except Exception as e:
        if os.path.exists(download_folder):
            shutil.rmtree(download_folder)
        print(f"Erreur lors du téléchargement : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/download")
async def download(request: DownloadRequest, background_tasks: BackgroundTasks):
    download_id = str(uuid.uuid4())
    try:
        background_tasks.add_task(
            download_video,
            request.url,
            request.format,
            request.quality,
            request.fileFormat,
            download_id
        )
        return {"download_id": download_id}
    except Exception as e:
        print(f"Erreur lors de la requête de téléchargement : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def get_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if os.path.exists(file_path):
        async def cleanup():
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Erreur lors de la suppression du fichier : {e}")
        
        return FileResponse(
            file_path,
            media_type='application/octet-stream',
            filename=filename,
            background=cleanup()
        )
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/status/{download_id}")
async def get_status(download_id: str):
    if download_id in current_downloads:
        progress = current_downloads[download_id]
        return {
            "progress": progress.progress,
            "title": progress.title,
            "filename": progress.filename,
            "is_playlist": progress.is_playlist
        }
    raise HTTPException(status_code=404, detail="Download not found")

# Nettoyage périodique des fichiers téléchargés
@app.on_event("startup")
async def startup_event():
    async def cleanup_downloads():
        while True:
            await asyncio.sleep(3600)  # Nettoie toutes les heures
            try:
                for filename in os.listdir(DOWNLOAD_DIR):
                    file_path = os.path.join(DOWNLOAD_DIR, filename)
                    if os.path.isfile(file_path):
                        # Supprime les fichiers plus vieux qu'une heure
                        if os.path.getmtime(file_path) < time.time() - 3600:
                            os.remove(file_path)
            except Exception as e:
                print(f"Erreur lors du nettoyage : {e}")

    asyncio.create_task(cleanup_downloads()) 