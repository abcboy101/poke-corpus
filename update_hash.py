import os
import re
import subprocess

CORPUS_FOLDER = './public/corpus'
CORPUS_JSON = './src/res/corpus.json'

# Calculate CRC32 hash of corpus files
stdout = subprocess.run(['7z', 'h', CORPUS_FOLDER], text=True, capture_output=True).stdout
crc32 = re.search("CRC32\s+for data and names:\s+([0-9A-F]{8})", stdout).group(1)

# Update hash in corpus.json
with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    data = f.read()
data = re.sub('"hash":\s+"([0-9A-F]{8})"', f'"hash": "{crc32}"', data)
with open(CORPUS_JSON, 'w', encoding='utf-8') as f:
    f.write(data)
