import sys
import io
import pyqt5_tools
from PyQt5 import QtCore, QtGui, QtWidgets, uic
from mainyt import Ytdlpclass


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
        # self.buttonBox_final.accepted.connect(self.handle_ok_button)

    def handle_ok_button(self):
        log_buffer = io.StringIO()

        url = self.lineEdit_url.text()
        path = self.lineEdit_path.text()
        current_index = self.comboBox_format.currentIndex()
        if url != "" and path != "":

            print("url : " + url)
            print("path : " + path)
            print("current_index : " + str(current_index))

            original_stdout = sys.stdout
            sys.stdout = log_buffer
            yt = Ytdlpclass(url,path)
            if current_index == 0 :
                yt.video()
            elif current_index == 1 :
                yt.audio_only()
            self.output = log_buffer.getvalue()
            sys.stdout = original_stdout

            #self.output += "url : " + url + "\n"
            #self.output += "path : " + path + "\n"
            self.plainTextEdit_output.appendPlainText(self.output)
            self.output = ""
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

if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    window = MainWindow()
    # window.ok_button_clicked.connect(window.handle_ok_button)
    window.show()
    app.exec_()
