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

