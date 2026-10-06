# สถานะโครงการ: Dashboard ข้าวนาปรัง

## ความคืบหน้า
- [x] สร้าง README.md และ project_status.md เริ่มต้นโปรเจกต์
- [x] แปลง PDF 4 ไฟล์ (2565-2568) เป็น `rice_offseason_long.csv` (สกัดด้วย PyMuPDF และเขียน script แปลงตารางเป็น CSV แล้ว)
- [x] ทำความสะอาดชื่อจังหวัด (เขียน script `clean_data.py` แมปชื่อจังหวัดที่มีปัญหาการเข้ารหัสตัวอักษรแล้ว)
- [ ] ตรวจสอบผลรวมระดับจังหวัดเทียบภาค/ประเทศ
- [x] สร้าง GeoJSON สำหรับแผนที่ (อยู่ระหว่างดาวน์โหลด shapefile และแปลงด้วย `simplify_geo.py`)
- [ ] ประมวลผลข้อมูล D2, D3, D4
- [x] พัฒนา Dashboard (สร้าง `index.html` และ `app.js` รองรับแผนที่ Leaflet และกราฟ Chart.js แล้ว)

## บันทึกการทำงาน
* **6 ตุลาคม 2569**: 
  - สร้างไฟล์ README.md และ project_status.md
  - สกัดข้อมูลจาก PDF 4 ไฟล์ด้วย PyMuPDF สำเร็จ ได้ข้อมูลผลผลิตข้าวนาปรัง 2565-2568 
  - สร้าง script `clean_data.py` เพื่อทำความสะอาดข้อมูลชื่อจังหวัด
  - สร้าง `simplify_geo.py` เพื่อดึง Shapefile ระดับจังหวัดมาลดทอนรายละเอียดเป็น GeoJSON สำหรับแสดงบนเว็บไซต์
  - สร้าง `index.html` และ `app.js` เป็นโครงสร้างของ Web Dashboard โดยใช้ Leaflet และ Chart.js
