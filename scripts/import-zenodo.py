"""Read CCID's original XLSX without changing it. Requires openpyxl."""
import hashlib, json, pathlib, sys
import openpyxl

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(__file__).resolve().parents[1] / 'data'
expected = 'aa3d3d467aabb2953e6bfede5f615491'
assert hashlib.md5(source.read_bytes()).hexdigest() == expected, 'Source checksum differs from CCID v1.1'
sheet = openpyxl.load_workbook(source, data_only=True)['data']
rows = list(sheet.values)
headers = list(rows[0])
fields = ['company', 'province', 'production_type', 'doc_year', 'cement_electricity', 'clinker_electricity', 'source']
records = []
for row_number, row in enumerate(rows[1:], 2):
    record = {field: row[headers.index(field)] for field in fields}
    record['row'] = row_number
    records.append(record)
assert len(records) == 1460
assert sum(isinstance(r['cement_electricity'], (int, float)) for r in records) == 1376
payload = {'title':'China Cement Industry Dataset (CCID)', 'author':'WU Tongyuan', 'version':'1.1', 'license':'CC BY 4.0', 'url':'https://zenodo.org/records/8083481', 'doi':'10.5281/zenodo.8083481', 'published':'2023-06-26', 'sourceFile':source.name, 'md5':expected, 'sheet':'data', 'records':records}
target.mkdir(exist_ok=True)
(target / 'zenodo.json').write_text(json.dumps(payload, ensure_ascii=False, allow_nan=False), encoding='utf-8')
print(f'Imported {len(records)} original rows; missing values preserved.')
