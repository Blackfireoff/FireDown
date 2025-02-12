from yt_dlp import YoutubeDL

def export_cookies():
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True
    }
    
    with YoutubeDL(ydl_opts) as ydl:
        try:
            # Essayer d'extraire les cookies de YouTube
            cookies = ydl.cookiejar.dump("youtube.cookies", ignore_discard=True, ignore_expires=True)
            print("Cookies exportés avec succès !")
        except Exception as e:
            print(f"Erreur lors de l'exportation des cookies : {str(e)}")

if __name__ == "__main__":
    export_cookies() 