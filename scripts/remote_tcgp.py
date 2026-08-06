import glob
import json
import os.path

from natsort import natsorted

FOLDER_PATH = "./remote/tcg-pocket-assets/Texts"
OUTPUT_FOLDER = "./corpus/TCGPocket"


def convert_lang(lang: str) -> str:
    match lang:
        case 'zh_TW':
            return 'zh-Hant'
        case 'pt_BR':
            return 'pt-BR'
    return lang.split('_')[0]


def make_id(key: str, filename: str):
    assert '^' not in key
    key = key.replace('.', '^')
    return '.'.join(['tcgp', filename, key])


# Check latest version
print('Checking folder for latest version...')
if not os.path.exists(FOLDER_PATH):
    # See https://github.com/SombrAbsol/aladump for how to dump these files
    print(f'TCG Pocket folder not found!')
    exit()
version = max(os.path.basename(p) for p in glob.iglob(os.path.join(FOLDER_PATH, '*/*')))
print(f'Found version {version}')

# Check modified time
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
src_times = [os.path.getmtime(path) for path in glob.iglob(os.path.join(FOLDER_PATH, f'*/{version}/*.json'))]
dst_times = [os.path.getmtime(path) for path in glob.iglob(os.path.join(OUTPUT_FOLDER, '*.txt'))]
if dst_times and max(dst_times) >= max(src_times):
    print(f'No changes found')
    exit()

# Load the source data in all languages
print(f'Loading files...')
map: dict[str, dict[str, str]] = {}
lang_list = []
for path in glob.iglob(os.path.join(FOLDER_PATH, f'*/{version}/*.json')):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    base = os.path.splitext(os.path.basename(path))[0]
    lang = os.path.basename(os.path.dirname(os.path.dirname(path)))
    if lang not in lang_list:
        lang_list.append(lang)

    for sid, text in data.items():
        if sid.startswith('Localize'):
            continue
        sid = make_id(sid, base)
        map.setdefault(sid, {})[lang] = text
    # print(f'Loaded {base}')

# Write the text files in all languages
print('Writing files...')
lang_files = {}
try:
    for code in lang_list:
        lang_files[code] = open(os.path.join(OUTPUT_FOLDER, f'{convert_lang(code)}_text.txt'), 'w', encoding='utf-8')
    with open(os.path.join(OUTPUT_FOLDER, 'qid_text.txt'), 'w', encoding='utf-8') as qid:
        for sid in natsorted(map):
            lang_text = map[sid]
            qid.write(f'{sid}\n')
            for lang in lang_list:
                f = lang_files[lang]
                text = lang_text.get(lang, '[NULL]')
                if isinstance(text, list):
                    f.write('\U000F1000'.join(s.replace('\\', '\\\\').replace('\n', '\\n') for s in text))
                else:
                    f.write(text.replace('\\', '\\\\').replace('\n', '\\n'))
                f.write('\n')
finally:
    for f in lang_files.values():
        f.close()

print('Done!')
