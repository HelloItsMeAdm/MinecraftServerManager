import tkinter as tk
from tkinter import filedialog
import sys

root = tk.Tk()
root.withdraw()

# ask for .jar file
file_path = filedialog.askopenfilename(
    filetypes=[("Java Archive", "*.jar")],
    title="Select a .jar file",
    initialdir="D:/MINECRAFT",
)

if file_path:
    print(file_path)
    sys.exit(0)
else:
    sys.exit(1)
