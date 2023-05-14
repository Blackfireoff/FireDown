import sys
import io
from PyQt5 import QtCore, QtGui, QtWidgets, uic
import threading
import os
import yt_dlp
import time


class Ytdlpclass:
    def __init__(self, url, path):
        self.yt = yt_dlp
        self.url = url
        self.path = os.path.join(path)
        self.count = 0

    def postprocessor_hook(self, info):
        if info['status'] == 'started':
            self.count += 1
            print("[index] " + str(self.count))

    def audio_only(self):
        options = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': f'{self.path}/audio/%(title)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'm4a',
            }],
            'postprocessor_hooks': [self.postprocessor_hook]
        }
        self.yt.YoutubeDL(options).download(self.url)

    def video(self):
        options = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': f'{self.path}/videos/%(title)s.%(ext)s',
            'postprocessor_hooks': [self.postprocessor_hook]
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

        return num_items


class MainWindow(QtWidgets.QMainWindow):
    ok_button_clicked = QtCore.pyqtSignal()
    cancel_button_clicked = QtCore.pyqtSignal()

    already_printed = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        uic.loadUi("mainwindows.ui", self)
        self.pushButton_download.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_download.clicked.connect(self.handle_ok_button)
        self.pushButton_cancel.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_cancel.clicked.connect(self.cancel_text)
        self.progressBar_items.hide()

        self.pushButton_path.clicked.connect(self.open_directory_dialog)
        # self.buttonBox_final.accepted.connect(self.handle_ok_button)

    def append_html_to_plain_text_edit(self):
        self.plainTextEdit_output.appendHtml("<span style='color: orange;'>Téléchargement(s) en cours... </span><br>")

    def append_html_to_plain_text_end(self):
        self.plainTextEdit_output.appendHtml("<span style='color: green;'>Téléchargement(s) réussit !</span><br>")

    def handle_ok_button(self):

        url = self.lineEdit_url.text()
        path = self.lineEdit_path.text()
        current_index = self.comboBox_format.currentIndex()
        self.append_html_to_plain_text_edit()

        print("url : " + url)
        print("path : " + path)
        print("current_index : " + str(current_index))

        # Step 2: Create a QThread object
        self.thread = QtCore.QThread()
        # Step 3: Create a worker object
        self.worker = Worker(url, path, current_index)
        # Step 4: Move worker to the thread
        self.worker.moveToThread(self.thread)
        # Step 5: Connect signals and slots
        self.thread.started.connect(self.worker.run)
        self.worker.finished.connect(self.thread.quit)
        self.worker.finished.connect(self.worker.deleteLater)

        self.thread.finished.connect(self.thread.deleteLater)
        # Step 6: Start the thread
        self.thread.start()

        self.thread.finished.connect(self.append_html_to_plain_text_end)

        # elif current_index == 1 :
        #    thread2 = threading.Thread(target=yt.audio_only)
        #    thread2.start()

        # self.output = log_buffer.getvalue()
        # sys.stdout = original_stdout

        # self.output += "url : " + url + "\n"
        # self.output += "path : " + path + "\n"
        # self.plainTextEdit_output.appendPlainText(self.output)
        # self.output = ""

    def cancel_text(self):
        self.lineEdit_url.setText("")
        self.lineEdit_path.setText("")
        self.comboBox_format.setCurrentIndex(0)

    def open_directory_dialog(self):
        directory_dialog = QtWidgets.QFileDialog()
        directory_dialog.setFileMode(QtWidgets.QFileDialog.DirectoryOnly)

        if directory_dialog.exec_():
            selected_directory = directory_dialog.selectedFiles()
            if selected_directory:
                print("Chemin du dossier sélectionné :", selected_directory[0])
                self.lineEdit_path.setText(selected_directory[0])


class Worker(QtCore.QObject):
    finished = QtCore.pyqtSignal()

    def __init__(self, url, path, index):
        super().__init__()
        self.url = url
        self.path = path
        self.index = index

    def run(self):
        if self.index == 0:
            yt = Ytdlpclass(self.url, self.path)
            yt.video()
            self.finished.emit()
        if self.index == 1:
            yt = Ytdlpclass(self.url, self.path)
            yt.audio_only()
            self.finished.emit()


if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()
    # window.ok_button_clicked.connect(window.handle_ok_button)
    window.show()
    app.exec_()