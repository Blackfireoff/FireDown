import sys
from PyQt5 import QtCore, QtGui, QtWidgets, uic
import yt_dlp


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

    def current_index(self, param):
        print("[Info] - Nbr current :" + str(param))
        self.progressBar_items.setValue(param)

    def init_index(self, param):
        print("[Info] - Nbr max :" + str(param))
        self.progressBar_items.setMaximum(param)

    def show_error(self,param):
        print(param)
        self.plainTextEdit_output.appendHtml("<span style='color: red;'>/!\ Erreur rencontrée /!\</span><br>")

    def handle_ok_button(self):

        url = self.lineEdit_url.text()
        path = self.lineEdit_path.text()
        current_index = self.comboBox_format.currentIndex()
        self.append_html_to_plain_text_edit()

        print("url : " + url)
        print("path : " + path)
        print("current_index : " + str(current_index))

        self.progressBar_items.show()

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
        self.worker.progress.connect(self.current_index)
        self.worker.init_val.connect(self.init_index)
        self.worker.error.connect(self.show_error)

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
    progress = QtCore.pyqtSignal(int)
    init_val = QtCore.pyqtSignal(int)
    error = QtCore.pyqtSignal(str)

    def __init__(self, url, path, index):
        super().__init__()
        self.url = url
        self.path = path
        self.index = index
        self.yt = yt_dlp

    def run(self):
        if self.index == 0:
            self.video()
            self.finished.emit()
        if self.index == 1:
            self.audio_only()
            self.finished.emit()

    def postprocessor_hook(self, info):
        # print(info)
        if info['status'] == 'finished':
            if '__last_playlist_index' in info['info_dict'] :
                self.progress.emit(info['info_dict']['playlist_index'])
                self.init_val.emit(info['info_dict']['__last_playlist_index'])
            else:
                self.progress.emit(1)
                self.init_val.emit(1)
        if info['status'] == 'error':
            # print(info)
            self.error.emit(info)

            # print(info['fragment_index'],info['fragment_count'])

    def audio_only(self):
        options = {
            'format': 'm4a/bestaudio/best',
            'outtmpl': f'{self.path}/audio/%(title)s.%(ext)s',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'm4a',
            }],
            'progress_hooks': [self.postprocessor_hook],
            'quiet': 1
        }
        try:
            self.yt.YoutubeDL(options).download(self.url)
        except yt_dlp.utils.DownloadError as E:
            self.error.emit(E.msg)

    def video(self):
        options = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': f'{self.path}/videos/%(title)s.%(ext)s',
            'progress_hooks': [self.postprocessor_hook],
            'quiet': 1
        }
        try:
            self.yt.YoutubeDL(options).download(self.url)
        except yt_dlp.utils.DownloadError as E:
            self.error.emit(E.msg)


if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()
    # window.ok_button_clicked.connect(window.handle_ok_button)
    window.show()
    app.exec_()
