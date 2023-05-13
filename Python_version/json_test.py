import yt_dlp

URL = 'https://www.youtube.com/watch?v=xFe2vxVZWkY&list=PLIKpCFu8Fpmn0JDARZC4DryDF-QOHwufy'


class MyLogger:
    def __init__(self):
        self.current_index = None
        self.count = 0
    def return_count(self,data):
        return self.count
    def postprocessor_hook(self, info):
        if info['status'] == 'started':
            self.count += 1
            self.return_count(self.count)
       #  if 'index' in info:
            # if self.current_index != info['index']:
            #     self.current_index = info['index']
             #    print(f"Downloading video index: {self.current_index}")



ydl_opts = {
    'postprocessor_hooks': [MyLogger().postprocessor_hook],
    'postprocessor_hooks': [MyLogger().return_count]
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([URL])