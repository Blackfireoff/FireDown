import yt_dlp

URL = 'https://www.youtube.com/watch?v=xFe2vxVZWkY&list=PLIKpCFu8Fpmn0JDARZC4DryDF-QOHwufy'

ydl_opts = {}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(URL, download=False)

    if 'entries' in info:
        num_items = len(info['entries'])
        print(f"Number of items to be downloaded: {num_items}")
    else:
        num_items = 1
        print("Only one item to be downloaded")
