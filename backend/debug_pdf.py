import pdfplumber
import sys

def extract(path):
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                print(text)
                print("-" * 20)

if __name__ == "__main__":
    extract(sys.argv[1])
