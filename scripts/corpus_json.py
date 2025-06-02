import os.path
import subprocess

CORPUS_JSON = './src/res/corpus.json'
CORPUS_JSON_TS = './src/res/corpusJson.ts'

try:
    if os.path.getmtime(CORPUS_JSON_TS) >= os.path.getmtime(CORPUS_JSON):
        exit()
except OSError:
    pass

print('Updating TypeScript exports...')
with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    s = f.read().strip()
with open(CORPUS_JSON_TS, 'w', encoding='utf-8') as f:
    f.write(f'const corpusJson = {s} as const;\n\n\nexport default corpusJson;')

subprocess.run(['eslint', '--fix', 'src/res/corpusJson.ts'], shell=True)
