import yt_dlp


def download_playlist(url):
    ydl_opts = {
        'quiet': True,
        'ignoreerrors': True,
        'noplaylist': False,
        'progress_hooks': [progress_hook],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        playlist_info = ydl.extract_info(url, download=False)
        total_videos = playlist_info.get('entries')
        if total_videos:
            total_videos = len(total_videos)
        else:
            total_videos = 0

        for index, entry in enumerate(playlist_info['entries'], start=1):
            current_index = index
            print(f'Downloading video {current_index}/{total_videos}: {entry["title"]}')
            ydl.download([entry['webpage_url']])


def progress_hook(d):
    if d['status'] == 'downloading':
        print(f"Downloading video {current_index}/{total_videos}: {d['filename']}")


# Exemple d'utilisation
playlist_url = 'https://www.youtube.com/watch?v=xFe2vxVZWkY&list=PLIKpCFu8Fpmn0JDARZC4DryDF-QOHwufy'
download_playlist(playlist_url)
