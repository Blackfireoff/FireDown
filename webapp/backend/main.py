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
from starlette.background import BackgroundTask

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

# ---------------------------
# Modèles de données
# ---------------------------
class DownloadRequest(BaseModel):
    url: str
    format: str
    quality: str
    fileFormat: str

class DownloadStatus:
    def __init__(self):
        self.progress = 0
        self.title = ""
        self.filename = ""
        self.is_ready = False
        self.error = None

class VideoInfo(BaseModel):
    title: str
    duration: str
    thumbnail: str
    size: Optional[str] = None
    isPlaylist: bool = False
    playlistItems: list = []

# Stockage des statuts de téléchargement
download_statuses = {}

# ---------------------------
# Fonctions utilitaires
# ---------------------------
def get_format_selection(format_type: str, quality: str, file_format: str) -> str:
    if format_type == "audio":
        return "bestaudio/best"
    
    quality_filter = ""
    if quality == "medium":
        quality_filter = "[height<=720]"
    elif quality == "lowest":
        quality_filter = "[height<=480]"

    if file_format in ['mp4', 'webm']:
        return f"bestvideo[ext={file_format}]{quality_filter}+bestaudio[ext={file_format}]/best[ext={file_format}]{quality_filter}/best"
    else:
        return f"bestvideo{quality_filter}+bestaudio/best{quality_filter}/best"

def progress_hook(d, download_id):
    if download_id in download_statuses:
        status = download_statuses[download_id]
        if d['status'] == 'downloading':
            if 'total_bytes' in d and 'downloaded_bytes' in d:
                status.progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
            elif 'total_bytes_estimate' in d and 'downloaded_bytes' in d:
                status.progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
        elif d['status'] == 'finished':
            status.progress = 99

def format_duration(duration: int) -> str:
    hours = duration // 3600
    minutes = (duration % 3600) // 60
    seconds = duration % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"

def format_size(size: int) -> str:
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"

# ---------------------------
# Fonction de téléchargement
# ---------------------------
async def download_video(url: str, format_type: str, quality: str, file_format: str, download_id: str):
    status = DownloadStatus()
    download_statuses[download_id] = status

    download_folder = os.path.join(DOWNLOAD_DIR, f"download_{download_id}")
    os.makedirs(download_folder, exist_ok=True)

    ffmpeg_location = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ffmpeg", "bin")
    
    try:
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

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info is None:
                raise Exception("Impossible d'extraire les informations de la vidéo")
            
            status.title = info.get('title', '')
            info = ydl.extract_info(url, download=True)
            
            if 'entries' in info:  # Playlist
                zip_filename = f"playlist_{download_id}.zip"
                zip_path = os.path.join(DOWNLOAD_DIR, zip_filename)
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    for root, dirs, files in os.walk(download_folder):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, download_folder)
                            zipf.write(file_path, arcname)
                status.filename = zip_filename
            else:
                files = os.listdir(download_folder)
                if not files:
                    raise Exception("Le fichier n'a pas pu être téléchargé")
                
                downloaded_file = os.path.join(download_folder, files[0])
                if format_type == "video" and file_format not in ['mp4', 'webm']:
                    final_filename = f"{os.path.splitext(os.path.basename(downloaded_file))[0]}.{file_format}"
                    final_path = os.path.join(DOWNLOAD_DIR, final_filename)
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
                        final_path = os.path.join(DOWNLOAD_DIR, os.path.basename(downloaded_file))
                        shutil.copy2(downloaded_file, final_path)
                        final_filename = os.path.basename(downloaded_file)
                else:
                    final_filename = os.path.basename(downloaded_file)
                    final_path = os.path.join(DOWNLOAD_DIR, final_filename)
                    shutil.copy2(downloaded_file, final_path)
                
                status.filename = final_filename

            shutil.rmtree(download_folder)
            status.progress = 100
            status.is_ready = True

    except Exception as e:
        if os.path.exists(download_folder):
            shutil.rmtree(download_folder)
        status.error = str(e)
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------
# Routes
# ---------------------------
@app.post("/start-download")
async def start_download(request: DownloadRequest, background_tasks: BackgroundTasks):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/check-status/{download_id}")
async def check_status(download_id: str):
    if download_id not in download_statuses:
        raise HTTPException(status_code=404, detail="Téléchargement non trouvé")
    
    status = download_statuses[download_id]
    response = {
        "progress": status.progress,
        "title": status.title,
        "is_ready": status.is_ready
    }
    
    if status.error:
        response["error"] = status.error
    if status.is_ready:
        response["filename"] = status.filename
    
    return response

@app.get("/download-file/{download_id}")
async def download_file(download_id: str):
    if download_id not in download_statuses:
        raise HTTPException(status_code=404, detail="Téléchargement non trouvé")
    
    status = download_statuses[download_id]
    if not status.is_ready:
        raise HTTPException(status_code=400, detail="Le fichier n'est pas encore prêt")
    
    file_path = os.path.join(DOWNLOAD_DIR, status.filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(
        file_path,
        media_type='application/octet-stream',
        filename=status.filename
    )

@app.post("/cleanup/{download_id}")
async def cleanup(download_id: str):
    if download_id not in download_statuses:
        raise HTTPException(status_code=404, detail="Téléchargement non trouvé")
    
    status = download_statuses[download_id]
    file_path = os.path.join(DOWNLOAD_DIR, status.filename)
    
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
        del download_statuses[download_id]
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video-info")
async def get_video_info(url: str):
    try:
        ydl_opts = {
            'no_check_certificates': True,
            'nocheckcertificate': True,
            'quiet': True,
            'extract_flat': 'in_playlist',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if 'entries' in info:
                playlist_items = []
                for entry in info['entries']:
                    if entry:
                        playlist_items.append({
                            'title': entry.get('title', 'Unknown'),
                            'duration': format_duration(entry.get('duration', 0)),
                            'thumbnail': entry.get('thumbnail', None)
                        })
                return VideoInfo(
                    title=info.get('title', 'Unknown Playlist'),
                    duration=f"{len(playlist_items)} videos",
                    thumbnail=info.get('entries', [{}])[0].get('thumbnail', None),
                    isPlaylist=True,
                    playlistItems=playlist_items
                )
            else:
                return VideoInfo(
                    title=info.get('title', 'Unknown'),
                    duration=format_duration(info.get('duration', 0)),
                    thumbnail=info.get('thumbnail', None),
                    size=format_size(info.get('filesize', 0)) if info.get('filesize') else None,
                    isPlaylist=False
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Nettoyage périodique
@app.on_event("startup")
async def startup_event():
    async def cleanup_downloads():
        while True:
            await asyncio.sleep(3600)  # Nettoyage toutes les heures
            try:
                current_time = time.time()
                # Nettoyage des fichiers
                for filename in os.listdir(DOWNLOAD_DIR):
                    file_path = os.path.join(DOWNLOAD_DIR, filename)
                    if os.path.isfile(file_path):
                        if os.path.getmtime(file_path) < current_time - 3600:
                            os.remove(file_path)
                
                # Nettoyage des statuts
                for download_id in list(download_statuses.keys()):
                    status = download_statuses[download_id]
                    if status.is_ready or status.error:
                        del download_statuses[download_id]
            except Exception as e:
                print(f"Erreur lors du nettoyage : {e}")
    
    asyncio.create_task(cleanup_downloads())
