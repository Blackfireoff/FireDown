import os

import yt_dlp


class Ytdlpclass:
    def __init__(self, url, path):
        self.yt = yt_dlp
        self.url = url
        self.path = os.path.join(path)

    def audio_only(self):
        options = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': f'{self.path}/audio/%(title)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'm4a',
            }]
        }
        self.yt.YoutubeDL(options).download(self.url)

    def video(self):
        options = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': f'{self.path}/videos/%(title)s.%(ext)s',
        }
        self.yt.YoutubeDL(options).download(self.url)

    def nbr_items(self):
        ydl_opts = {}

        with self.yt.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(self.url, download=False)

            if 'entries' in info:
                num_items = len(info['entries'])
                print(f"Number of items to be downloaded: {num_items}")
            else:
                num_items = 1
                print("Only one item to be downloaded")

