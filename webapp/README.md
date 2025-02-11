# FireDown - Téléchargeur de Vidéos/Audios YouTube

FireDown est une application web moderne qui permet de télécharger des vidéos et des audios depuis YouTube avec différentes options de qualité et de format.

## Fonctionnalités

- Téléchargement de vidéos et d'audios YouTube
- Support des playlists (téléchargement groupé en ZIP)
- Sélection de la qualité (haute, moyenne, basse)
- Choix du format de sortie (MP4, MKV, MP3, M4A)
- Conversion automatique des formats audio
- Barre de progression en temps réel
- Interface utilisateur moderne et réactive

## Prérequis

- Python 3.12 ou supérieur
- Node.js 18 ou supérieur
- npm ou yarn

## Installation

1. Cloner le repository :
```bash
git clone <repository-url>
cd webapp
```

2. Installation des dépendances backend :
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Sur Windows : .\venv\Scripts\activate
pip install -r ../requirements.txt
```

3. Installation de FFmpeg (automatique) :
```bash
# Dans le dossier backend avec l'environnement virtuel activé
python setup_ffmpeg.py
```

4. Installation des dépendances frontend :
```bash
cd ../frontend
npm install
```

## Configuration

L'application crée automatiquement les dossiers nécessaires :
- `backend/downloads` : Dossier temporaire pour les fichiers téléchargés
- `backend/ffmpeg` : Dossier contenant FFmpeg pour la conversion audio

## Lancement de l'application

1. Démarrer le backend :
```bash
cd backend
source venv/bin/activate  # Sur Windows : .\venv\Scripts\activate
uvicorn main:app --reload
```

2. Démarrer le frontend (dans un nouveau terminal) :
```bash
cd frontend
npm start
```

L'application sera accessible à l'adresse : http://localhost:3000

## Utilisation

1. Collez l'URL de la vidéo ou de la playlist YouTube dans le champ URL
2. Sélectionnez le type de téléchargement :
   - Vidéo : MP4 ou MKV
   - Audio : MP3 ou M4A
3. Pour les vidéos, choisissez la qualité souhaitée :
   - Meilleure : Meilleure qualité disponible
   - Moyenne : 720p
   - Basse : Qualité minimale
4. Cliquez sur "Télécharger"
5. Attendez que le téléchargement et la conversion soient terminés
6. Le fichier sera automatiquement téléchargé sur votre ordinateur

## Notes

- Les fichiers téléchargés sont automatiquement supprimés du serveur après une heure
- Pour les playlists, tous les fichiers sont regroupés dans une archive ZIP
- L'application nécessite une connexion Internet stable
- La conversion audio (MP3, M4A) est gérée automatiquement par FFmpeg
- En cas de problème avec FFmpeg, relancez le script `setup_ffmpeg.py`

## Structure du projet

```
webapp/
├── backend/
│   ├── downloads/     # Dossier des téléchargements temporaires
│   ├── ffmpeg/       # Binaires FFmpeg
│   ├── venv/         # Environnement virtuel Python
│   ├── main.py       # API FastAPI
│   └── setup_ffmpeg.py # Script d'installation de FFmpeg
└── frontend/
    ├── public/
    ├── src/
    └── package.json
```

## Licence

MIT 