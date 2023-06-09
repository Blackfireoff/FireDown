# -*- coding: utf-8 -*-

import io
import sys
from PyQt5 import QtCore, QtGui, QtWidgets, QtWebEngineWidgets, uic
import yt_dlp
import json


class MainWindow(QtWidgets.QMainWindow):
    ok_button_clicked = QtCore.pyqtSignal()
    cancel_button_clicked = QtCore.pyqtSignal()
    langue = QtCore.pyqtSignal()

    already_printed = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        uic.loadUi("mainwindows.ui", self)
        with open('global_var.json') as f:
            data = json.load(f)
        if data['save_path_enable'] == "True":
            self.actionSave_the_path.setChecked(True)
            self.lineEdit_path.setText(data['save_path'])
        if data['show_advance_log'] == "True":
            self.actionShow_advance_logs.setChecked(True)
        self.langue(data['language_select'])
        self.pushButton_download.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_download.clicked.connect(self.handle_ok_button)
        self.pushButton_cancel.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_cancel.clicked.connect(self.cancel_text)
        self.actionEnglish.triggered.connect(self.selec_en)
        self.actionFrancais.triggered.connect(self.selec_fr)
        self.actionSave_the_path.triggered.connect(self.save_path)
        self.progressBar_items.hide()
        self.pushButton_path.clicked.connect(self.open_directory_dialog)
        self.actionShowSupportedWebsite.triggered.connect(self.open_supported_websites)
        self.actionShow_advance_logs.triggered.connect(self.show_advance_log)

        self.cancel_button_clicked.connect(self.handle_cancel_button)

        self.setWindowTitle("FireDown")
        icon_path = "icon.png"
        icon = QtGui.QIcon(icon_path)
        self.setWindowIcon(icon)
        self.setFixedSize(684, 329)

    # def dialogue_redemarrage(self):
    #    Créer une boîte de dialogue d'information
    #    dialogue = QtWidgets.QMessageBox()
    #    dialogue.setWindowTitle("Information")
    #    dialogue.setText("Veuillez redemarrer l'application pour que les changements prennent effet.")
    #    dialogue.setIcon(QtWidgets.QMessageBox.Information)
    #    dialogue.addButton(QtWidgets.QMessageBox.Ok)
    #    dialogue.exec_()

    def show_advance_log(self):
        with open('global_var.json', 'r') as f:
            data = json.load(f)
        if self.actionShow_advance_logs.isChecked():
            data['show_advance_log'] = "True"
        else:
            data['show_advance_log'] = "False"
        with open('global_var.json', 'w') as f:
            json.dump(data, f, indent=4)
        print("[JSON] Global_var - show_advance_log : " + data['show_advance_log'])


    def open_supported_websites(self):
        QtGui.QDesktopServices.openUrl(QtCore.QUrl("https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md"))

    def handle_cancel_button(self):
        self.worker.finished.emit()

    def save_path(self):
        with open('global_var.json', 'r') as f:
            data = json.load(f)
        if self.actionSave_the_path.isChecked():
            data['save_path'] = self.lineEdit_path.text().replace(" ", "")
            data['save_path_enable'] = "True"
        else:
            data['save_path'] = ""
            data['save_path_enable'] = "False"
        with open('global_var.json', 'w') as f:
            json.dump(data, f, indent=4)
        print("[JSON] Global_var - save_path : " + data['save_path'])
        print("[JSON] Global_var - save_path_enable : " + data['save_path_enable'])

    def selec_fr(self):
        self.langue("FR")


    def selec_en(self):
        self.langue("EN")

    def langue(self, langue):
        with open('langue.json', 'r') as f:
            data = json.load(f)

        self.label_path.setText(data[langue]['Path'])
        self.label_format.setText(data[langue]['Format'])
        self.label_url.setText(data[langue]['URL'])
        self.label_output.setText(data[langue]['Output'])
        self.actionSave_the_path.setText(data[langue]['save_path_lang'])
        self.comboBox_format.setItemText(0, data[langue]['ListFormat'][0])
        self.comboBox_format.setItemText(1, data[langue]['ListFormat'][1])
        self.comboBox_format.setItemText(2, data[langue]['ListFormat'][2])
        self.pushButton_path.setText(data[langue]['ButtonPath'])
        self.pushButton_download.setText(data[langue]['ButtonDownload'])
        self.pushButton_cancel.setText(data[langue]['ButtonCancel'])
        self.menuSettings.setTitle(data[langue]['SettingMenu'])
        self.menuLanguage.setTitle(data[langue]['LanguageMenu'])
        self.menuHelp.setTitle(data[langue]['HelpMenuTitle'])
        self.actionShowSupportedWebsite.setText(data[langue]['ShowSupportedWebsite'])
        self.actionShow_advance_logs.setText(data[langue]['ShowAdvanceLog'])

        with open('global_var.json', 'r') as f:
            data = json.load(f)
        data['language_select'] = langue
        with open('global_var.json', 'w') as f:
            json.dump(data, f, indent=4)

    def show_avancement_in_log(self,param):
        self.plainTextEdit_output.appendHtml(f"<span style='color: black;'>{str(param)}</span>")

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

    def show_error(self, param):
        print(param)
        self.plainTextEdit_output.appendHtml("<span style='color: red;'>/!\ Erreur rencontrée /!\</span><br>")

    def handle_ok_button(self):

        url = self.lineEdit_url.text().replace(" ", "")
        path = self.lineEdit_path.text().replace(" ", "")
        current_index = self.comboBox_format.currentIndex()
        self.append_html_to_plain_text_edit()
        self.save_path()
        print("url : " + url)
        print("path : " + path)
        print("current_index : " + str(current_index))

        self.progressBar_items.show()

        self.pushButton_cancel.clicked.connect(self.cancel_button_clicked.emit)

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
        self.worker.percentage_progress.connect(self.show_avancement_in_log)
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
                self.save_path()


class Worker(QtCore.QObject):
    finished = QtCore.pyqtSignal()
    progress = QtCore.pyqtSignal(int)
    init_val = QtCore.pyqtSignal(int)
    percentage_progress = QtCore.pyqtSignal(str)
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
            self.audio_mp3()
            self.finished.emit()
        if self.index == 2:
            self.audio_only()
            self.finished.emit()

    def postprocessor_hook(self, info):
        with open('global_var.json', 'r') as f:
            data = json.load(f)
        if data['show_advance_log'] == "True":
            self.percentage_progress.emit(info['_default_template'])
        if '__last_playlist_index' not in info['info_dict']:
            self.progress.emit(int(info['_percent_str'].split(".")[0]))
            self.init_val.emit(100)
        if info['status'] == 'finished':
            if '__last_playlist_index' in info['info_dict']:
                self.progress.emit(info['info_dict']['playlist_index'])
                self.init_val.emit(info['info_dict']['__last_playlist_index'])
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

    def audio_mp3(self):
        options = {
            'format': 'bestaudio/best',
            'outtmpl': f'{self.path}/audio/%(title)s.%(ext)s',
            'audioformat': 'mp3',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
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
    if sys.stderr is None:
        stream = io.StringIO()
        sys.stdout = stream
        sys.stderr = stream

    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()

    # window.ok_button_clicked.connect(window.handle_ok_button)
    window.show()
    app.exec_()
