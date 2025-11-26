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


def fix(s: str) -> str:
    """Fixes stray line breaks near calls to a number branch."""
    if match := next(re.finditer(r'(?:\\n)?\[VAR 1101\([0-9A-F]{4},([0-9A-F]{2})([0-9A-F]{2})\)]', s), None):
        ofsM = ofsS = ofsP = 0
        startM = match.start()
        if s[startM:startM + 2] == r'\n':
            ofsM += 2
        endM = match.end()
        if s[endM:endM + 2] == r'\n':
            ofsS += 2
            ofsP += 2
        endS = endM + int(match.group(2), 16)
        if s[endS:endS + 2] == r'\n':
            ofsP += 2
        endP = endS + int(match.group(1), 16)
        return ''.join([s[:startM], s[startM + ofsM:endM], s[endM + ofsS:endS + ofsS], s[endS + ofsP:endP + ofsP], fix(s[endP + ofsP:])])
    return s


# Clone/pull remote repository
if not os.path.exists(REPO_PATH) or len(os.listdir(REPO_PATH)) == 0:
    print(f'Downloading repository...')
    subprocess.run(['git', 'clone', '--filter=blob:none', REPO_URL, REPO_PATH], check=True)

print(f'Checking if repository is up to date...')
subprocess.run(['git', 'pull'], cwd=REPO_PATH, check=True)

# Check modified time
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
src_times = [os.path.getmtime(path) for path in glob.iglob(os.path.join(REPO_PATH, '**/msbt_*_lf.txt'), recursive=True)]
dst_times = [os.path.getmtime(path) for path in glob.iglob(os.path.join(OUTPUT_FOLDER, '*_megaturtle_sp.txt'))]
if dst_times and max(dst_times) >= max(src_times):
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
    match = re.search(r'msbt_(.+)_lf\.txt', base)
    assert match is not None
    lang = match.group(1)
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
            assert file in map
            map[file].setdefault(sid, {})[lang] = fix(string_text)

# Write the text files in all languages
print('Writing files...')
lang_files = {code: open(os.path.join(OUTPUT_FOLDER, f'{convert_lang(code)}_megaturtle_sp.txt'), 'w', encoding='utf-8') for code in lang_list}
try:
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
