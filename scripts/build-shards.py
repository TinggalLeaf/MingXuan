#!/usr/bin/env python3
"""Build sqlite3 shards from SQL dump files."""
import sqlite3, os, sys, json, glob

src_dir = 'src-tauri/resources/naming-data/shards_sql'
dst_dir = 'src-tauri/resources/naming-data/shards'
os.makedirs(dst_dir, exist_ok=True)

# Clean dst
for f in os.listdir(dst_dir):
    os.remove(os.path.join(dst_dir, f))

# Map: source_name → name for new file
mapping = {
    'sources-chuci': 'sources-chuci.sqlite3',
    'sources-lunyu': 'sources-lunyu.sqlite3',
    'sources-shijing': 'sources-shijing.sqlite3',
    'sources-songci': 'sources-songci.sqlite3',
    'sources-songshi-1': 'sources-songshi-1.sqlite3',
    'sources-songshi-2': 'sources-songshi-2.sqlite3',
    'sources-songshi-3': 'sources-songshi-3.sqlite3',
    'sources-tangshi-1': 'sources-tangshi-1.sqlite3',
    'sources-tangshi-2': 'sources-tangshi-2.sqlite3',
    'sources-zhouyi': 'sources-zhouyi.sqlite3',
    'valid_names-1': 'valid_names-1.sqlite3',
    'valid_names-2': 'valid_names-2.sqlite3',
}

for src_base, dst_name in mapping.items():
    sql_path = os.path.join(src_dir, src_base + '.sql')
    db_path = os.path.join(dst_dir, dst_name)
    if not os.path.exists(sql_path): continue
    if os.path.exists(db_path): os.remove(db_path)
    conn = sqlite3.connect(db_path)
    conn.execute('PRAGMA journal_mode = OFF')
    conn.execute('PRAGMA synchronous = OFF')
    with open(sql_path, 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.execute('VACUUM')
    conn.close()
    print(f'  {db_path}: {os.path.getsize(db_path)/1024/1024:.1f} MB')

# Write index.json
with open(os.path.join(dst_dir, 'index.json'), 'w') as f:
    json.dump({
        'version': 1,
        'shards': list(mapping.values()),
    }, f, ensure_ascii=False, indent=2)

print('---summary---')
total = 0
for fn in sorted(os.listdir(dst_dir)):
    p = os.path.join(dst_dir, fn)
    sz = os.path.getsize(p)
    total += sz
    print(f'  {fn}: {sz/1024/1024:.1f} MB')
print(f'TOTAL: {total/1024/1024:.1f} MB')
