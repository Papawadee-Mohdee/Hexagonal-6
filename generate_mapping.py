import pandas as pd
import csv

prov_data = [
("Bangkok", "กรุงเทพมหานคร", "ภาคกลาง", "TH10"),
("Samut Prakan", "สมุทรปราการ", "ภาคกลาง", "TH11"),
("Nonthaburi", "นนทบุรี", "ภาคกลาง", "TH12"),
("Pathum Thani", "ปทุมธานี", "ภาคกลาง", "TH13"),
("Phra Nakhon Si Ayutthaya", "พระนครศรีอยุธยา", "ภาคกลาง", "TH14"),
("Ang Thong", "อ่างทอง", "ภาคกลาง", "TH15"),
("Lop Buri", "ลพบุรี", "ภาคกลาง", "TH16"),
("Sing Buri", "สิงห์บุรี", "ภาคกลาง", "TH17"),
("Chai Nat", "ชัยนาท", "ภาคกลาง", "TH18"),
("Saraburi", "สระบุรี", "ภาคกลาง", "TH19"),
("Chon Buri", "ชลบุรี", "ภาคตะวันออก", "TH20"),
("Rayong", "ระยอง", "ภาคตะวันออก", "TH21"),
("Chanthaburi", "จันทบุรี", "ภาคตะวันออก", "TH22"),
("Trat", "ตราด", "ภาคตะวันออก", "TH23"),
("Chachoengsao", "ฉะเชิงเทรา", "ภาคตะวันออก", "TH24"),
("Prachin Buri", "ปราจีนบุรี", "ภาคตะวันออก", "TH25"),
("Nakhon Nayok", "นครนายก", "ภาคกลาง", "TH26"),
("Sa Kaeo", "สระแก้ว", "ภาคตะวันออก", "TH27"),
("Nakhon Ratchasima", "นครราชสีมา", "ภาคตะวันออกเฉียงเหนือ", "TH30"),
("Buri Ram", "บุรีรัมย์", "ภาคตะวันออกเฉียงเหนือ", "TH31"),
("Surin", "สุรินทร์", "ภาคตะวันออกเฉียงเหนือ", "TH32"),
("Si Sa Ket", "ศรีสะเกษ", "ภาคตะวันออกเฉียงเหนือ", "TH33"),
("Ubon Ratchathani", "อุบลราชธานี", "ภาคตะวันออกเฉียงเหนือ", "TH34"),
("Yasothon", "ยโสธร", "ภาคตะวันออกเฉียงเหนือ", "TH35"),
("Chaiyaphum", "ชัยภูมิ", "ภาคตะวันออกเฉียงเหนือ", "TH36"),
("Amnat Charoen", "อำนาจเจริญ", "ภาคตะวันออกเฉียงเหนือ", "TH37"),
("Bueng Kan", "บึงกาฬ", "ภาคตะวันออกเฉียงเหนือ", "TH38"),
("Nong Bua Lam Phu", "หนองบัวลำภู", "ภาคตะวันออกเฉียงเหนือ", "TH39"),
("Khon Kaen", "ขอนแก่น", "ภาคตะวันออกเฉียงเหนือ", "TH40"),
("Udon Thani", "อุดรธานี", "ภาคตะวันออกเฉียงเหนือ", "TH41"),
("Loei", "เลย", "ภาคตะวันออกเฉียงเหนือ", "TH42"),
("Nong Khai", "หนองคาย", "ภาคตะวันออกเฉียงเหนือ", "TH43"),
("Maha Sarakham", "มหาสารคาม", "ภาคตะวันออกเฉียงเหนือ", "TH44"),
("Roi Et", "ร้อยเอ็ด", "ภาคตะวันออกเฉียงเหนือ", "TH45"),
("Kalasin", "กาฬสินธุ์", "ภาคตะวันออกเฉียงเหนือ", "TH46"),
("Sakon Nakhon", "สกลนคร", "ภาคตะวันออกเฉียงเหนือ", "TH47"),
("Nakhon Phanom", "นครพนม", "ภาคตะวันออกเฉียงเหนือ", "TH48"),
("Mukdahan", "มุกดาหาร", "ภาคตะวันออกเฉียงเหนือ", "TH49"),
("Chiang Mai", "เชียงใหม่", "ภาคเหนือ", "TH50"),
("Lamphun", "ลำพูน", "ภาคเหนือ", "TH51"),
("Lampang", "ลำปาง", "ภาคเหนือ", "TH52"),
("Uttaradit", "อุตรดิตถ์", "ภาคเหนือ", "TH53"),
("Phrae", "แพร่", "ภาคเหนือ", "TH54"),
("Nan", "น่าน", "ภาคเหนือ", "TH55"),
("Phayao", "พะเยา", "ภาคเหนือ", "TH56"),
("Chiang Rai", "เชียงราย", "ภาคเหนือ", "TH57"),
("Mae Hong Son", "แม่ฮ่องสอน", "ภาคเหนือ", "TH58"),
("Nakhon Sawan", "นครสวรรค์", "ภาคกลาง", "TH60"),
("Uthai Thani", "อุทัยธานี", "ภาคกลาง", "TH61"),
("Kamphaeng Phet", "กำแพงเพชร", "ภาคกลาง", "TH62"),
("Tak", "ตาก", "ภาคตะวันตก", "TH63"),
("Sukhothai", "สุโขทัย", "ภาคกลาง", "TH64"),
("Phitsanulok", "พิษณุโลก", "ภาคกลาง", "TH65"),
("Phichit", "พิจิตร", "ภาคกลาง", "TH66"),
("Phetchabun", "เพชรบูรณ์", "ภาคกลาง", "TH67"),
("Ratchaburi", "ราชบุรี", "ภาคตะวันตก", "TH70"),
("Kanchanaburi", "กาญจนบุรี", "ภาคตะวันตก", "TH71"),
("Suphan Buri", "สุพรรณบุรี", "ภาคกลาง", "TH72"),
("Nakhon Pathom", "นครปฐม", "ภาคกลาง", "TH73"),
("Samut Sakhon", "สมุทรสาคร", "ภาคกลาง", "TH74"),
("Samut Songkhram", "สมุทรสงคราม", "ภาคกลาง", "TH75"),
("Phetchaburi", "เพชรบุรี", "ภาคตะวันตก", "TH76"),
("Prachuap Khiri Khan", "ประจวบคีรีขันธ์", "ภาคตะวันตก", "TH77"),
("Nakhon Si Thammarat", "นครศรีธรรมราช", "ภาคใต้", "TH80"),
("Krabi", "กระบี่", "ภาคใต้", "TH81"),
("Phangnga", "พังงา", "ภาคใต้", "TH82"),
("Phuket", "ภูเก็ต", "ภาคใต้", "TH83"),
("Surat Thani", "สุราษฎร์ธานี", "ภาคใต้", "TH84"),
("Ranong", "ระนอง", "ภาคใต้", "TH85"),
("Chumphon", "ชุมพร", "ภาคใต้", "TH86"),
("Songkhla", "สงขลา", "ภาคใต้", "TH90"),
("Satun", "สตูล", "ภาคใต้", "TH91"),
("Trang", "ตรัง", "ภาคใต้", "TH92"),
("Phatthalung", "พัทลุง", "ภาคใต้", "TH93"),
("Pattani", "ปัตตานี", "ภาคใต้", "TH94"),
("Yala", "ยะลา", "ภาคใต้", "TH95"),
("Narathiwat", "นราธิวาส", "ภาคใต้", "TH96")
]

# Write to mapping CSV
with open("mapping.csv", "w", encoding="utf-8-sig", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["adm1_name", "province_th", "region", "pcode"])
    writer.writerows(prov_data)

# Read the original parsed csv
df = pd.read_csv("temp_parsed.csv", encoding="utf-8-sig")

# The names in temp_parsed.csv might have garbled text like "ใต" instead of "ใต้". We already mapped them in clean_data.py
# Let's re-run the clean logic
invalid_names = ['ประเทศ/ภาค/จังหวัด', 'ที่ความชื้น 15%']
df = df[~df['name'].isin(invalid_names)].copy()
replacements = {
    'ใต': 'ใต้', 'ใหม': 'ใหม่', 'แมฮองสอน': 'แม่ฮ่องสอน', 'แพร': 'แพร่',
    'นาน': 'น่าน', 'อุตรดิตถ': 'อุตรดิตถ์', 'นครสวรรค': 'นครสวรรค์',
    'เพชรบูรณ': 'เพชรบูรณ์', 'สุรินทร': 'สุรินทร์', 'บุรีรัมย': 'บุรีรัมย์',
    'กาฬสินธุ': 'กาฬสินธุ์', 'ขอนแกน': 'ขอนแก่น', 'สระแกว': 'สระแก้ว',
    'ประจวบคีรีขันธ': 'ประจวบคีรีขันธ์', 'สุราษฎรธานี': 'สุราษฎร์ธานี',
    'ปตตานี': 'ปัตตานี', 'อยุธยา': 'พระนครศรีอยุธยา', 'ลําปาง': 'ลำปาง', 
    'ลําพูน': 'ลำพูน', 'หนองบัวลําภู': 'หนองบัวลำภู', 'รอยเอ็ด': 'ร้อยเอ็ด', 
    'อางทอง': 'อ่างทอง', 'อํานาจเจริญ': 'อำนาจเจริญ', 'กําแพงเพชร': 'กำแพงเพชร', 
    'สิงหบุรี': 'สิงห์บุรี'
}
for k, v in replacements.items():
    df['name'] = df['name'].str.replace(k, v)

# Create a mapping dict from province_th to region and pcode
prov_dict = {row[1]: {'region': row[2], 'pcode': row[3]} for row in prov_data}

# Assign new columns
def assign_pcode(name):
    return prov_dict.get(name, {}).get('pcode', '')

def assign_region(name):
    return prov_dict.get(name, {}).get('region', '')

df['pcode'] = df['name'].apply(assign_pcode)
df['region'] = df['name'].apply(assign_region)

# Identify unmapped names that are NOT totals/headers
unmapped = df[(df['pcode'] == '') & (~df['name'].isin(['ภาคกลาง', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคเหนือ', 'ภาคใต้', 'ภาคใต', 'รวมทั้งประเทศ']))]['name'].unique()
if len(unmapped) > 0:
    print("WARNING: Unmapped provinces found:", unmapped)

# Filter out rows that are not provinces (like region totals)
df = df[df['pcode'] != '']

# Sort by name
df = df.sort_values(by=['year_be', 'name'])

df.to_csv("rice_offseason_cleaned_v2.csv", index=False, encoding="utf-8-sig")
print("Cleaned CSV generated.")
