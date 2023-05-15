from PyQt5.QtWidgets import QApplication, QMainWindow, QMessageBox, QPushButton

app = QApplication([])
window = QMainWindow()

# Fonction appelée lorsque le bouton est cliqué
def montrer_dialogue():
    # Créer une boîte de dialogue d'information
    dialogue = QMessageBox()
    dialogue.setWindowTitle("Information")
    dialogue.setText("Ceci est un message d'information.")
    dialogue.setIcon(QMessageBox.Information)
    dialogue.addButton(QMessageBox.Ok)
    dialogue.exec_()

button = QPushButton("Afficher la boîte de dialogue", window)
button.clicked.connect(montrer_dialogue)

window.setCentralWidget(button)
window.show()
app.exec_()
