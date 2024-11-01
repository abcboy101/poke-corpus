import codecs
import gzip
import json
import os.path
import pathlib

TEXT_FOLDER = './corpus'
GZIP_FOLDER = './public/corpus'
CORPUS_JSON = './src/res/corpus.json'

# Read corpus.json
with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

for collection_key, collection in corpus['collections'].items():
    for language in collection['languages']:
        for file in collection['files']:
            text_path = pathlib.Path('/'.join([TEXT_FOLDER, collection_key, f'{language}_{file}.txt']))
            gzip_path = pathlib.Path('/'.join([GZIP_FOLDER, collection_key, f'{language}_{file}.txt.gz']))

            # Check modified time
            try:
                if os.path.getmtime(gzip_path) >= os.path.getmtime(text_path):
                    continue
            except OSError:
                pass

            # Load text file
            with open(text_path, 'rb') as f:
                buf = f.read().removeprefix(codecs.BOM_UTF8)

            # Abort if it already matches the existing file
            try:
                with open(gzip_path, 'rb') as f:
                    cmp = f.read()
                dec = gzip.decompress(cmp)
                if dec.replace(b'\r\n', b'\n') == buf.replace(b'\r\n', b'\n'):
                    continue
                os.remove(gzip_path)
            except FileNotFoundError:
                pass

            # Compress and overwrite
            cmp = gzip.compress(buf, mtime=0)
            gzip_path.parent.mkdir(parents=True, exist_ok=True)
            with open(gzip_path, 'wb') as f:
                f.write(cmp)
