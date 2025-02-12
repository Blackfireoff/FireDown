FROM python:3.11-slim

WORKDIR /app

# Installation des dépendances système nécessaires
RUN apt-get update && apt-get install -y \
    wget \
    xz-utils \
    && rm -rf /var/lib/apt/lists/*

# Copie des fichiers nécessaires
COPY requirements.txt .
COPY setup_ffmpeg.py .
COPY main.py .

# Installation des dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Installation de ffmpeg via le script
RUN python setup_ffmpeg.py

# Configuration de yt-dlp
RUN mkdir -p /root/.cache/yt-dlp && \
    chmod 777 /root/.cache/yt-dlp

# Création du dossier downloads
RUN mkdir -p downloads

# Exposition du port
EXPOSE 8000

# Commande de démarrage
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 