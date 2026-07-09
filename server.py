import os
import csv
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

DB_FILE = 'voter_data.db'
CSV_FILE = 'voter_data.csv'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Check if table exists and has data
    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='voters'")
    table_exists = cursor.fetchone()[0] > 0
    
    if table_exists:
        cursor.execute("SELECT count(*) FROM voters")
        count = cursor.fetchone()[0]
        if count > 0:
            print(f"[*] Database already initialized with {count:,} records.")
            conn.close()
            return

    print(f"[*] Initializing database from {CSV_FILE}...")
    cursor.execute("DROP TABLE IF EXISTS voters")
    
    cursor.execute("""
    CREATE TABLE voters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ac_no TEXT,
        sr_no INTEGER,
        booth_no TEXT,
        name TEXT,
        relation TEXT,
        father_name TEXT,
        epic_number TEXT,
        age INTEGER,
        sex TEXT,
        house_no TEXT,
        anubhag_number TEXT,
        anubhag_name TEXT,
        polling_station_name TEXT,
        polling_station_address TEXT,
        main_town TEXT,
        ward TEXT,
        post_office TEXT,
        police_station TEXT,
        tehsil TEXT,
        district TEXT,
        pin_code TEXT
    )
    """)
    
    if os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode='r', encoding='utf-8', errors='replace') as f:
            reader = csv.reader(f)
            header = next(reader, None)
            batch = []
            for row in reader:
                if not row or not any(field.strip() for field in row):
                    continue
                if len(row) < 21:
                    row.extend([''] * (21 - len(row)))
                elif len(row) > 21:
                    row = row[:21]
                
                try:
                    sr_no = int(row[1]) if row[1].strip().isdigit() else 0
                except:
                    sr_no = 0
                    
                try:
                    age = int(row[7]) if row[7].strip().isdigit() else 0
                except:
                    age = 0
                
                batch.append((
                    row[0].strip(), sr_no, row[2].strip(), row[3].strip(),
                    row[4].strip(), row[5].strip(), row[6].strip(), age,
                    row[8].strip(), row[9].strip(), row[10].strip(), row[11].strip(),
                    row[12].strip(), row[13].strip(), row[14].strip(), row[15].strip(),
                    row[16].strip(), row[17].strip(), row[18].strip(), row[19].strip(),
                    row[20].strip()
                ))
                
                if len(batch) >= 2000:
                    cursor.executemany("""
                    INSERT INTO voters (
                        ac_no, sr_no, booth_no, name, relation, father_name, epic_number,
                        age, sex, house_no, anubhag_number, anubhag_name, polling_station_name,
                        polling_station_address, main_town, ward, post_office, police_station,
                        tehsil, district, pin_code
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, batch)
                    batch = []
            
            if batch:
                cursor.executemany("""
                INSERT INTO voters (
                    ac_no, sr_no, booth_no, name, relation, father_name, epic_number,
                    age, sex, house_no, anubhag_number, anubhag_name, polling_station_name,
                    polling_station_address, main_town, ward, post_office, police_station,
                    tehsil, district, pin_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
        
        print("[*] Creating high-speed indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_epic ON voters(epic_number)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_name ON voters(name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_father ON voters(father_name)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_booth ON voters(booth_no)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_ward ON voters(ward)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sex ON voters(sex)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_age ON voters(age)")
        conn.commit()
        print("[*] Database initialization complete!")
    else:
        print(f"[!] Warning: {CSV_FILE} not found. Using empty table.")
    conn.close()

class DashboardRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query = urllib.parse.parse_qs(parsed_path.query)
        
        if path.startswith('/api/'):
            self.handle_api(path, query)
        else:
            if path == '/' or path == '':
                self.path = '/index.html'
            super().do_GET()

    def handle_api(self, path, query):
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            if path == '/api/stats':
                cursor.execute("SELECT count(*) FROM voters")
                total = cursor.fetchone()[0]
                
                cursor.execute("SELECT AVG(age) FROM voters WHERE age > 0")
                avg_age = round(cursor.fetchone()[0] or 0, 1)
                
                cursor.execute("SELECT count(*) FROM voters WHERE age > 0 AND age <= 21")
                first_time = cursor.fetchone()[0]
                
                cursor.execute("SELECT count(DISTINCT booth_no) FROM voters WHERE booth_no != ''")
                total_booths = cursor.fetchone()[0]
                
                cursor.execute("SELECT count(DISTINCT ward) FROM voters WHERE ward != ''")
                total_wards = cursor.fetchone()[0]
                
                # Gender counts
                cursor.execute("SELECT sex, count(*) FROM voters GROUP BY sex")
                sex_rows = cursor.fetchall()
                sex_breakdown = {row['sex']: row['count(*)'] for row in sex_rows}
                
                male = sex_breakdown.get('पुरुष', 0) + sex_breakdown.get('Male', 0) + sex_breakdown.get('M', 0)
                female = sex_breakdown.get('महिला', 0) + sex_breakdown.get('Female', 0) + sex_breakdown.get('F', 0)
                other = total - (male + female)
                
                data = {
                    "total": total,
                    "male": male,
                    "female": female,
                    "other": max(0, other),
                    "avg_age": avg_age,
                    "first_time_voters": first_time,
                    "total_booths": total_booths,
                    "total_wards": total_wards
                }
                self.send_json(data)
                
            elif path == '/api/charts':
                # Age Groups
                cursor.execute("""
                    SELECT 
                        CASE 
                            WHEN age BETWEEN 18 AND 25 THEN '18-25 (Gen Z)'
                            WHEN age BETWEEN 26 AND 35 THEN '26-35 (Young Adult)'
                            WHEN age BETWEEN 36 AND 50 THEN '36-50 (Middle Age)'
                            WHEN age BETWEEN 51 AND 65 THEN '51-65 (Senior)'
                            WHEN age > 65 THEN '65+ (Elderly)'
                            ELSE 'Unknown/Other'
                        END AS age_group,
                        COUNT(*) as cnt
                    FROM voters
                    WHERE age > 0
                    GROUP BY age_group
                """)
                age_groups = {row['age_group']: row['cnt'] for row in cursor.fetchall()}
                
                # Top 10 Booths
                cursor.execute("""
                    SELECT booth_no, polling_station_name, COUNT(*) as cnt
                    FROM voters
                    WHERE booth_no != ''
                    GROUP BY booth_no, polling_station_name
                    ORDER BY cnt DESC
                    LIMIT 10
                """)
                top_booths = [{"booth_no": row['booth_no'], "station": row['polling_station_name'][:30], "count": row['cnt']} for row in cursor.fetchall()]
                
                # Ward Breakdown (Top 12)
                cursor.execute("""
                    SELECT ward, COUNT(*) as cnt
                    FROM voters
                    WHERE ward != ''
                    GROUP BY ward
                    ORDER BY cnt DESC
                    LIMIT 12
                """)
                wards = [{"ward": row['ward'], "count": row['cnt']} for row in cursor.fetchall()]
                
                self.send_json({
                    "age_groups": age_groups,
                    "top_booths": top_booths,
                    "wards": wards
                })
                
            elif path == '/api/filters':
                cursor.execute("SELECT DISTINCT booth_no, polling_station_name, ward FROM voters WHERE booth_no != '' ORDER BY CAST(booth_no AS INTEGER), booth_no")
                booths = [{"booth_no": row[0], "station": row[1], "ward": row[2]} for row in cursor.fetchall()]
                
                cursor.execute("SELECT DISTINCT ward, COUNT(*) FROM voters WHERE ward != '' GROUP BY ward ORDER BY ward")
                wards = [{"ward": row[0], "count": row[1]} for row in cursor.fetchall()]
                
                cursor.execute("SELECT DISTINCT sex FROM voters WHERE sex != '' ORDER BY sex")
                sexes = [row[0] for row in cursor.fetchall()]
                
                cursor.execute("SELECT DISTINCT anubhag_number, anubhag_name, booth_no, ward FROM voters WHERE anubhag_name != '' ORDER BY CAST(booth_no AS INTEGER), CAST(anubhag_number AS INTEGER)")
                anubhags = [{"number": row[0], "name": row[1], "booth_no": row[2], "ward": row[3]} for row in cursor.fetchall()]
                
                cursor.execute("SELECT DISTINCT relation FROM voters WHERE relation != '' ORDER BY relation")
                relations = [row[0] for row in cursor.fetchall()]
                
                self.send_json({
                    "booths": booths,
                    "wards": wards,
                    "sexes": sexes,
                    "anubhags": anubhags,
                    "relations": relations
                })
                
            elif path == '/api/voters':
                search = query.get('search', [''])[0].strip()
                booth = query.get('booth', [''])[0].strip()
                ward = query.get('ward', [''])[0].strip()
                sex = query.get('sex', [''])[0].strip()
                anubhag = query.get('anubhag', [''])[0].strip()
                relation = query.get('relation', [''])[0].strip()
                house_no = query.get('house_no', [''])[0].strip()
                min_age = int(query.get('min_age', [0])[0] or 0)
                max_age = int(query.get('max_age', [120])[0] or 120)
                page = int(query.get('page', [1])[0] or 1)
                per_page = min(500, int(query.get('per_page', [50])[0] or 50))
                
                where_clauses = ["(epic_number != '' OR name != '')"]
                params = []
                
                if search:
                    where_clauses.append("(epic_number LIKE ? OR name LIKE ? OR father_name LIKE ? OR house_no LIKE ? OR polling_station_address LIKE ? OR anubhag_name LIKE ?)")
                    like_str = f"%{search}%"
                    params.extend([like_str, like_str, like_str, like_str, like_str, like_str])
                    
                if booth:
                    where_clauses.append("booth_no = ?")
                    params.append(booth)
                if ward:
                    where_clauses.append("ward = ?")
                    params.append(ward)
                if sex:
                    where_clauses.append("sex = ?")
                    params.append(sex)
                if anubhag:
                    where_clauses.append("(anubhag_name = ? OR anubhag_number = ?)")
                    params.extend([anubhag, anubhag])
                if relation:
                    where_clauses.append("relation = ?")
                    params.append(relation)
                if house_no:
                    where_clauses.append("house_no LIKE ?")
                    params.append(f"%{house_no}%")
                if min_age > 0:
                    where_clauses.append("age >= ?")
                    params.append(min_age)
                if max_age < 120:
                    where_clauses.append("age <= ?")
                    params.append(max_age)
                    
                where_sql = " AND ".join(where_clauses)
                
                # Total count
                cursor.execute(f"SELECT count(*) FROM voters WHERE {where_sql}", params)
                total_records = cursor.fetchone()[0]
                
                # Fetch page
                offset = (page - 1) * per_page
                cursor.execute(f"""
                    SELECT * FROM voters 
                    WHERE {where_sql} 
                    ORDER BY CAST(booth_no AS INTEGER), sr_no ASC 
                    LIMIT ? OFFSET ?
                """, params + [per_page, offset])
                
                rows = [dict(row) for row in cursor.fetchall()]
                
                self.send_json({
                    "data": rows,
                    "total": total_records,
                    "page": page,
                    "per_page": per_page,
                    "total_pages": (total_records + per_page - 1) // per_page
                })
                
            elif path == '/api/export':
                search = query.get('search', [''])[0].strip()
                booth = query.get('booth', [''])[0].strip()
                ward = query.get('ward', [''])[0].strip()
                sex = query.get('sex', [''])[0].strip()
                
                where_clauses = ["1=1"]
                params = []
                
                if search:
                    where_clauses.append("(epic_number LIKE ? OR name LIKE ? OR father_name LIKE ? OR house_no LIKE ?)")
                    like_str = f"%{search}%"
                    params.extend([like_str, like_str, like_str, like_str])
                if booth:
                    where_clauses.append("booth_no = ?")
                    params.append(booth)
                if ward:
                    where_clauses.append("ward = ?")
                    params.append(ward)
                if sex:
                    where_clauses.append("sex = ?")
                    params.append(sex)
                    
                where_sql = " AND ".join(where_clauses)
                cursor.execute(f"SELECT * FROM voters WHERE {where_sql} ORDER BY CAST(booth_no AS INTEGER), sr_no ASC LIMIT 10000", params)
                rows = cursor.fetchall()
                
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8')
                self.send_header('Content-Disposition', 'attachment; filename="filtered_voters.csv"')
                self.end_headers()
                
                # Add BOM for Excel UTF-8 compatibility
                self.wfile.write('\ufeff'.encode('utf-8'))
                writer = csv.writer(EchoWriter(self.wfile))
                writer.writerow([
                    'AC No', 'SR No', 'Booth No', 'Name', 'Relation', 'Father Name', 'EPIC NUMBER',
                    'age', 'sex', 'House No', 'Anubhag_number', 'Anubhag_name', 'Polling_Station_Name',
                    'Polling_Station_Address', 'Main_Town', 'Ward', 'Post_Office', 'Police_Station',
                    'Tehsil', 'District', 'Pin_Code'
                ])
                for row in rows:
                    writer.writerow([
                        row['ac_no'], row['sr_no'], row['booth_no'], row['name'], row['relation'],
                        row['father_name'], row['epic_number'], row['age'], row['sex'], row['house_no'],
                        row['anubhag_number'], row['anubhag_name'], row['polling_station_name'],
                        row['polling_station_address'], row['main_town'], row['ward'], row['post_office'],
                        row['police_station'], row['tehsil'], row['district'], row['pin_code']
                    ])
            else:
                self.send_error(404, "API endpoint not found")
        except Exception as e:
            print(f"[!] Error handling API {path}: {e}")
            self.send_error(500, str(e))
        finally:
            conn.close()

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

class EchoWriter:
    def __init__(self, wfile):
        self.wfile = wfile
    def write(self, text):
        self.wfile.write(text.encode('utf-8'))
        return len(text)

if __name__ == '__main__':
    print("[*] Starting Electoral Data Dashboard API Server...")
    init_db()
    
    port = 8000
    server_address = ('', port)
    httpd = HTTPServer(server_address, DashboardRequestHandler)
    print(f"\n=======================================================")
    print(f"🚀 Dashboard running at: http://localhost:{port}")
    print(f"📊 Serving dataset with high-speed SQLite indexed engine")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down server...")
        httpd.server_close()
