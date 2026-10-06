import re
import pandas as pd

def is_number(s):
    # Remove commas and spaces
    s = s.replace(',', '').replace(' ', '')
    try:
        float(s)
        return True
    except ValueError:
        return False

def parse_txt():
    data = []
    current_year = None
    
    with open('output_fitz.txt', 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
        
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for year marker
        if line.startswith('---') and line.endswith('---'):
            current_year = int(re.search(r'\d{4}', line).group())
            i += 1
            continue
            
        # Skip headers
        if any(x in line for x in ['ขาวนาปรัง', 'ป 256', 'เนื้อที่', 'ผลผลิต', '(ไร)', '(ตัน)', 'ปลูก', 'เก็บ']):
            i += 1
            continue
            
        if not is_number(line):
            # This is likely a province or region name
            name = line
            
            # Read next 5 valid lines for numbers
            nums = []
            j = i + 1
            while j < len(lines) and len(nums) < 5:
                if is_number(lines[j]):
                    nums.append(lines[j].replace(',', '').replace(' ', ''))
                j += 1
                
            if len(nums) == 5:
                data.append({
                    'year_be': current_year,
                    'name': name,
                    'planted_rai': float(nums[0]),
                    'harvested_rai': float(nums[1]),
                    'production_ton': float(nums[2]),
                    'yield_planted_kg_rai': float(nums[3]),
                    'yield_harvested_kg_rai': float(nums[4])
                })
                i = j
            else:
                i += 1
        else:
            i += 1
            
    df = pd.DataFrame(data)
    print("Total rows:", len(df))
    
    df.to_csv('temp_parsed.csv', index=False, encoding='utf-8-sig')

if __name__ == '__main__':
    parse_txt()
