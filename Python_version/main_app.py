import sys
import io
from PyQt5 import QtCore, QtGui, QtWidgets, uic
from mainyt import Ytdlpclass
import threading


class MainWindow(QtWidgets.QMainWindow):

    ok_button_clicked = QtCore.pyqtSignal()
    cancel_button_clicked = QtCore.pyqtSignal()

    already_printed = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        uic.loadUi("mainwindows.ui", self)
        self.output = ""
        self.pushButton_download.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_download.clicked.connect(self.handle_ok_button)
        self.pushButton_cancel.clicked.connect(self.ok_button_clicked.emit)
        self.pushButton_cancel.clicked.connect(self.cancel_text)
        self.progressBar_items.hide()

        self.pushButton_path.clicked.connect(self.open_directory_dialog)
        # self.buttonBox_final.accepted.connect(self.handle_ok_button)

    def append_html_to_plain_text_edit(self):
        self.output += "<span style='color: orange;'>Téléchargement(s) en cours... </span><br>"
        self.plainTextEdit_output.appendHtml(self.output)
        self.output = ""

    def append_html_to_plain_text_end(self):
        self.output += "<span style='color: green;'>Téléchargement(s) réussit !</span><br>"
        self.plainTextEdit_output.appendHtml(self.output)
        self.output = ""

    def handle_ok_button(self):


        url = self.lineEdit_url.text()
        path = self.lineEdit_path.text()
        current_index = self.comboBox_format.currentIndex()
        if url != "" and path != "":
            thread1 = threading.Thread(target=lambda: self.append_html_to_plain_text_edit() )
            thread3 = threading.Thread(target=lambda: self.append_html_to_plain_text_end())

            print("url : " + url)
            print("path : " + path)
            print("current_index : " + str(current_index))


            #nb_item = yt.nbr_items()
            #self.progressBar_items.show()

            #original_stdout = sys.stdout
            #sys.stdout = log_buffer

            thread1.start()
            thread1.join()

            yt = Ytdlpclass(url, path)

            if current_index == 0 :
                thread2 = threading.Thread(target=yt.video)
                thread2.start()

            elif current_index == 1 :
                thread2 = threading.Thread(target=yt.audio_only)
                thread2.start()


            thread2.join()
            thread3.start()

            #self.output = log_buffer.getvalue()
            #sys.stdout = original_stdout

            #self.output += "url : " + url + "\n"
            #self.output += "path : " + path + "\n"
            #self.plainTextEdit_output.appendPlainText(self.output)
            #self.output = ""
        elif url == "" and path != "":
            self.output += "<span style='color: red;'>Veuillez inserer une URL</span><br>"
            self.plainTextEdit_output.appendHtml(self.output)
            self.output = ""
        elif url != "" and path == "":
            self.output += "<span style='color: red;'>Veuillez renseigner le lieu de sauvegarde</span><br>"
            self.plainTextEdit_output.appendHtml(self.output)
            self.output = ""
        else:
            self.output += "<span style='color: red;'>Auncun champs n'est remplie.</span><br>"
            self.plainTextEdit_output.appendHtml(self.output)
            self.output = ""

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

if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()
    # window.ok_button_clicked.connect(window.handle_ok_button)
    window.show()
    app.exec_()
