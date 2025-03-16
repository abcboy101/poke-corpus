CORPUS_JSON = './src/res/corpus.json'
CORPUS_JSON_TS = './src/res/corpusJson.ts'

with open(CORPUS_JSON, 'r', encoding='utf-8') as f:
    s = f.read().strip()
with open(CORPUS_JSON_TS, 'w', encoding='utf-8') as f:
    f.write(f'const corpusJson = {s} as const;\n\n\nexport default corpusJson;')
