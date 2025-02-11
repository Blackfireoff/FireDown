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
        if file_format == "mp3":
            return "bestaudio/best"  # On laisse le post-processeur gérer la conversion en MP3
        return f"bestaudio[ext={file_format}]/bestaudio/best"
    
    # Video format selection
    if quality == "highest":
        return f"bestvideo[ext={file_format}]+bestaudio/best[ext={file_format}]/best"
    elif quality == "medium":
        return f"bestvideo[height<=720][ext={file_format}]+bestaudio/best[height<=720][ext={file_format}]/best"
    else:
        return f"worstvideo[ext={file_format}]+worstaudio/worst[ext={file_format}]/worst"

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

def get_final_filename(original_filename: str, format_type: str, file_format: str) -> str:
    if format_type == "audio" and file_format in ["mp3", "m4a"]:
        # Remplacer l'extension par le format demandé
        base_name = os.path.splitext(original_filename)[0]
        return f"{base_name}.{file_format}"
    return original_filename

async def download_video(url: str, format_type: str, quality: str, file_format: str, download_id: str):
    download_progress = DownloadProgress()
    current_downloads[download_id] = download_progress

    # Chemin vers FFmpeg
    ffmpeg_location = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg", "bin")
    
    ydl_opts = {
        'format': get_format_selection(format_type, quality, file_format),
        'outtmpl': os.path.join(DOWNLOAD_DIR, f'%(title)s.%(ext)s'),
        'progress_hooks': [lambda d: progress_hook(d, download_id)],
        # Options pour contourner les restrictions
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
    }

    if format_type == "audio":
        if file_format == "mp3":
            ydl_opts.update({
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
                'extractaudio': True,
                'format': 'bestaudio/best',
            })
        else:
            ydl_opts.update({
                'format': f'bestaudio[ext={file_format}]/bestaudio/best',
                'extractaudio': True,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': file_format,
                    'preferredquality': '192',
                }],
            })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Essayer d'abord d'extraire les informations sans télécharger
            try:
                info = ydl.extract_info(url, download=False)
                if info is None:
                    raise Exception("Impossible d'extraire les informations de la vidéo")
            except Exception as e:
                print(f"Erreur lors de l'extraction des informations : {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

            # Si l'extraction réussit, procéder au téléchargement
            info = ydl.extract_info(url, download=True)
            
            if 'entries' in info:  # C'est une playlist
                download_progress.is_playlist = True
                playlist_dir = os.path.join(DOWNLOAD_DIR, f"playlist_{download_id}")
                os.makedirs(playlist_dir, exist_ok=True)
                
                # Déplacer tous les fichiers téléchargés dans le dossier de la playlist
                for entry in info['entries']:
                    if entry is not None and 'title' in entry:
                        for filename in os.listdir(DOWNLOAD_DIR):
                            if entry['title'] in filename:
                                old_path = os.path.join(DOWNLOAD_DIR, filename)
                                new_path = os.path.join(playlist_dir, filename)
                                shutil.move(old_path, new_path)
                
                # Créer le fichier ZIP
                zip_filename = f"playlist_{download_id}.zip"
                zip_path = os.path.join(DOWNLOAD_DIR, zip_filename)
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    for root, dirs, files in os.walk(playlist_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, playlist_dir)
                            zipf.write(file_path, arcname)
                
                # Nettoyer le dossier temporaire
                shutil.rmtree(playlist_dir)
                download_progress.filename = zip_filename
            else:
                # Obtenir le nom de fichier préparé
                prepared_filename = ydl.prepare_filename(info)
                # Attendre un court instant pour la conversion
                await asyncio.sleep(2)
                # Obtenir le nom de fichier final après conversion
                final_filename = get_final_filename(
                    os.path.basename(prepared_filename),
                    format_type,
                    file_format
                )
                # Vérifier si le fichier existe
                final_path = os.path.join(DOWNLOAD_DIR, final_filename)
                if not os.path.exists(final_path):
                    # Attendre encore un peu si le fichier n'existe pas
                    await asyncio.sleep(3)
                
                download_progress.filename = final_filename
                
            download_progress.title = info.get('title', '')
            download_progress.progress = 100
            
    except Exception as e:
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
        return FileResponse(
            file_path,
            media_type='application/octet-stream',
            filename=filename
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