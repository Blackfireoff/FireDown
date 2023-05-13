import yt_dlp
from PyQt5.QtWidgets import QApplication, QMainWindow, QFileDialog, QPushButton

URL = 'https://www.youtube.com/watch?v=xFe2vxVZWkY&list=PLIKpCFu8Fpmn0JDARZC4DryDF-QOHwufy'


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.button = QPushButton("Ouvrir la fenêtre de navigation", self)
        self.button.clicked.connect(self.open_directory_dialog)

    def open_directory_dialog(self):
        directory_dialog = QFileDialog()
        directory_dialog.setFileMode(QFileDialog.DirectoryOnly)

        if directory_dialog.exec_():
            selected_directory = directory_dialog.selectedFiles()
            if selected_directory:
                print("Chemin du dossier sélectionné :", selected_directory[0])

                print("Chemin du fichier sélectionné :", selected_files[0])





if __name__ == "__main__":
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec_()
