import glob
import os.path
import re
import subprocess

REPO_URL = "https://github.com/sora10pls/megaturtle-text.git"
REPO_PATH = "./remote/megaturtle-text"
OUTPUT_FOLDER = "./corpus/HOME"


def convert_lang(lang: str) -> str:
    lang_codes = {
        'jpn': 'ja-Hrkt',
        'jpn_kanji': 'ja',
        'usa': 'en',
        'fra': 'fr',
        'ita': 'it',
        'deu': 'de',
        'esp': 'es',
        'kor': 'ko',
        'sch': 'zh-Hans',
        'tch': 'zh-Hant',
    }
    return lang_codes[lang]


# Clone/pull remote repository
if not os.path.exists(REPO_PATH) or len(os.listdir(REPO_PATH)) == 0:
    print(f'Downloading repository...')
    subprocess.run(['git', 'clone', '--filter=blob:none', REPO_URL, REPO_PATH], check=True)

print(f'Checking if repository is up to date...')
subprocess.run(['git', 'pull'], cwd=REPO_PATH, check=True)

# Check modified time
latest_src = max(os.path.getmtime(path) for path in glob.iglob(os.path.join(REPO_PATH, '**/msbt_*_lf.txt'), recursive=True))
latest_dst = max(os.path.getmtime(path) for path in glob.iglob(os.path.join(OUTPUT_FOLDER, '*_megaturtle_sp.txt')))
if latest_dst >= latest_src:
    print(f'No changes found')
    exit()

# Load the source data in all languages
print(f'Loading files...')
map: dict[str, dict[str, dict[str, str]]] = {}
lang_list = []
for path in glob.iglob(os.path.join(REPO_PATH, '**/msbt_*_lf.txt'), recursive=True):
    with open(path, 'r', encoding='utf-8') as f:
        data = f.read()

    base = os.path.basename(path)
    lang = re.search(r'msbt_(.+)_lf\.txt', base).group(1)
    if lang not in lang_list:
        lang_list.append(lang)

    suffix = f'_{lang}.msbt'
    file = None
    for text in data.split('\n'):
        if text.startswith('Text File : ') and text.endswith(suffix):
            file = text[12:-len(suffix)]
            map.setdefault(file, {})
        elif '\t' in text:
            sid, string_text = text.split('\t', 1)
            map[file].setdefault(sid, {})[lang] = string_text

# Write the text files in all languages
print('Writing files...')
try:
    lang_files = {code: open(os.path.join(OUTPUT_FOLDER, f'{convert_lang(code)}_megaturtle_sp.txt'), 'w', encoding='utf-8') for code in lang_list}
    with open(os.path.join(OUTPUT_FOLDER, 'qid_megaturtle_sp.txt'), 'w', encoding='utf-8') as qid:
        for file in sorted(map):
            for f in [qid, *lang_files.values()]:
                f.write(f'~~~~~~~~~~~~~~~\nText File : {file}\n~~~~~~~~~~~~~~~\n')
            for sid, lang_text in map[file].items():
                qid.write(f'home.sp.{file}.{sid}\n')
                for lang in lang_list:
                    f = lang_files[lang]
                    text = lang_text.get(lang, '[NULL]')
                    f.write(text)
                    f.write('\n')
finally:
    for f in lang_files.values():
        f.close()

print('Done!')
