import pdfplumber
import pandas as pd
import glob
import os
import re

def process_pdfs():
    for year in range(2565, 2569):
        filename = f"{year}.pdf"
        if not os.path.exists(filename):
            continue
            
        print(f"\n--- Processing {filename} tables ---")
        
        with pdfplumber.open(filename) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                print(f"Page {page_num + 1}: Found {len(tables)} tables")
                
                for i, table in enumerate(tables):
                    print(f"Table {i+1} rows: {len(table)}")
                    for row in table[:3]:
                        print(row)
                
                if page_num > 0:
                    break

if __name__ == '__main__':
    process_pdfs()
