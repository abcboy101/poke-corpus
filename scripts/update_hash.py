import concurrent.futures
import json
import os.path
import zlib

PUBLIC_FOLDER = './public'
CORPUS_JSON = './src/res/corpus.json'
OUTPUT_JSON = './public/data.json'

def get_metadata(file_path: str) -> tuple[str, int]:
    with open(os.path.join(PUBLIC_FOLDER, file_path), 'rb') as f:
        buf = f.read()
    file_hash = f'{zlib.crc32(buf):08X}'
    return file_hash, len(buf)

# Read corpus.json
with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

print('Calculating hashes...')
futures: list[concurrent.futures.Future] = []
hashes: list[str] = []
sizes: list[int] = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    try:
        for collection_key, collection in corpus['collections'].items():
            for language in collection['languages']:
                for file in collection['files']:
                    file_path = '/'.join(['corpus', collection_key, f'{language}_{file}.txt.gz'])
                    futures.append(executor.submit(get_metadata, file_path))

        for fu in futures:
            file_hash, file_size = fu.result()
            hashes.append(file_hash)
            sizes.append(file_size)
    except BaseException as e:
        executor.shutdown(cancel_futures=True)
        raise e

data = {
    'corpus': corpus,
    'hashes': hashes,
    'sizes': sizes,
}

# Check if data.json needs to be updated
try:
    with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
        data_old = json.load(f)
    if data == data_old:
        exit()
except FileNotFoundError:
    pass

# Update data.json
with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
