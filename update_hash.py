import json
import os.path
import zlib

PUBLIC_FOLDER = './public'
CORPUS_JSON = './src/res/corpus.json'
FILES_JSON = './src/res/files.json'

# Read corpus.json
with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

entries: dict[str, str] = {}
for collection_key, collection in corpus['collections'].items():
    for language in collection['languages']:
        for file in collection['files']:
            file_path = '/'.join(['corpus', collection_key, f'{language}_{file}.txt.gz'])
            with open(os.path.join(PUBLIC_FOLDER, file_path), 'rb') as f:
                buf = f.read()
            file_hash = f'{zlib.crc32(buf):08X}'
            entries[file_path] = {
                'hash': file_hash,
                'size': len(buf),
            }

# Update files.json
with open(FILES_JSON, 'w', encoding='utf-8') as f:
    json.dump(entries, f, indent=2)
