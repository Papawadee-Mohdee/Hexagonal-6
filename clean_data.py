import pandas as pd

def clean():
    df = pd.read_csv('temp_parsed.csv', encoding='utf-8-sig')
    
    # Filter out headers and invalid names
    invalid_names = ['ประเทศ/ภาค/จังหวัด', 'ที่ความชื้น 15%']
    df = df[~df['name'].isin(invalid_names)]
    
    # Map regions
    regions = ['ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคใต', 'รวมทั้งประเทศ']
    
    # Let's assign region to each province
    # Wait, the PDF order is Region -> Provinces in that region.
    # We can infer region by reading the sequence.
    
    # Actually, we can just replace Thai characters that are weird.
    # 'ใต' -> 'ใต้', 'ใหม' -> 'ใหม่', 'แมฮองสอน' -> 'แม่ฮ่องสอน', etc.
    # But wait, COD-AB uses standard Thai spelling. Let's just create a quick mapping for names.
    replacements = {
        'ใต': 'ใต้',
        'ใหม': 'ใหม่',
        'แมฮองสอน': 'แม่ฮ่องสอน',
        'แพร': 'แพร่',
        'นาน': 'น่าน',
        'อุตรดิตถ': 'อุตรดิตถ์',
        'นครสวรรค': 'นครสวรรค์',
        'เพชรบูรณ': 'เพชรบูรณ์',
        'สุรินทร': 'สุรินทร์',
        'บุรีรัมย': 'บุรีรัมย์',
        'กาฬสินธุ': 'กาฬสินธุ์',
        'ขอนแกน': 'ขอนแก่น',
        'สระแกว': 'สระแก้ว',
        'ประจวบคีรีขันธ': 'ประจวบคีรีขันธ์',
        'สุราษฎรธานี': 'สุราษฎร์ธานี',
        'ปตตานี': 'ปัตตานี',
        'อยุธยา': 'พระนครศรีอยุธยา'
    }
    
    for k, v in replacements.items():
        df['name'] = df['name'].str.replace(k, v)
        
    df.to_csv('rice_offseason_cleaned.csv', index=False, encoding='utf-8-sig')
    
if __name__ == '__main__':
    clean()
