import pymupdf
import os

def process_pdfs():
    with open('output_fitz.txt', 'w', encoding='utf-8') as f:
        for year in range(2565, 2569):
            filename = f"{year}.pdf"
            if not os.path.exists(filename):
                continue
                
            f.write(f"\n--- {year} ---\n")
            doc = pymupdf.open(filename)
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                f.write(text)
                f.write("\n")
            doc.close()

if __name__ == '__main__':
    process_pdfs()
