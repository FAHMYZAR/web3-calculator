import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
from PIL import Image, ImageTk
import pytesseract
import cv2

# Atur lokasi tesseract.exe di sini
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


class ImageToTextApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Image to Text Converter")
        self.root.geometry("800x600")
        
        self.image_path = None
        self.setup_ui()
    
    def setup_ui(self):
        # Frame tombol
        button_frame = tk.Frame(self.root)
        button_frame.pack(pady=10)
        
        # Tombol pilih gambar
        self.select_btn = tk.Button(
            button_frame, 
            text="Pilih Gambar", 
            command=self.select_image,
            bg="lightblue"
        )
        self.select_btn.pack(side=tk.LEFT, padx=5)
        
        # Tombol ekstrak teks
        self.extract_btn = tk.Button(
            button_frame, 
            text="Ekstrak Teks", 
            command=self.extract_text,
            bg="lightgreen",
            state=tk.DISABLED
        )
        self.extract_btn.pack(side=tk.LEFT, padx=5)
        
        # Frame isi utama
        content_frame = tk.Frame(self.root)
        content_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Label untuk gambar
        self.image_label = tk.Label(content_frame, text="Gambar akan ditampilkan di sini")
        self.image_label.pack()
        
        # Area teks hasil
        self.text_area = scrolledtext.ScrolledText(
            content_frame, 
            height=15,
            wrap=tk.WORD
        )
        self.text_area.pack(fill=tk.BOTH, expand=True, pady=10)
    
    def select_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[
                ("Image files", "*.jpg *.jpeg *.png *.bmp *.tiff"),
                ("All files", "*.*")
            ]
        )
        
        if file_path:
            self.image_path = file_path
            self.display_image(file_path)
            self.extract_btn.config(state=tk.NORMAL)
    
    def display_image(self, image_path):
        try:
            image = Image.open(image_path)
            # Resize gambar untuk tampilan
            image.thumbnail((400, 400))
            photo = ImageTk.PhotoImage(image)
            
            self.image_label.config(image=photo)
            self.image_label.image = photo
        except Exception as e:
            messagebox.showerror("Error", f"Gagal memuat gambar: {str(e)}")
    
    def extract_text(self):
        if not self.image_path:
            return
        
        try:
            # Ekstraksi teks dari gambar
            image = Image.open(self.image_path)
            text = pytesseract.image_to_string(image, lang='eng')
            
            # Tampilkan hasil
            self.text_area.delete(1.0, tk.END)
            self.text_area.insert(tk.END, text)
            
        except Exception as e:
            messagebox.showerror("Error", f"Gagal mengekstrak teks: {str(e)}")


if __name__ == "__main__":
    root = tk.Tk()
    app = ImageToTextApp(root)
    root.mainloop()
