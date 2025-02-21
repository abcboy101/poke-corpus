import glob
import json
import os.path
import re
import subprocess

REPO_URL = "https://github.com/sora10pls/holoholo-text.git"
REPO_PATH = "./remote/holoholo-text"
RELEASE_FOLDER = os.path.join(REPO_PATH, "Release")
REMOTE_FOLDER = os.path.join(REPO_PATH, "Remote")
OUTPUT_FOLDER = "./corpus/GO"


def convert_lang(lang: str) -> str:
    match lang:
        case 'zh-tw':
            return 'zh-Hant'
        case 'pt-br':
            return 'pt-BR'
        case 'es-mx':
            return 'es-419'
    return lang.split('-')[0]


def make_id(key: str):
    return f'go.{key}'


# Clone/pull remote repository
if not os.path.exists(REPO_PATH) or len(os.listdir(REPO_PATH)) == 0:
    print(f'Downloading repository...')
    subprocess.run(['git', 'clone', '--filter=blob:none', REPO_URL, REPO_PATH], check=True)

print(f'Checking if repository is up to date...')
subprocess.run(['git', 'pull'], cwd=REPO_PATH, check=True)

# Check modified time
latest_src = max(os.path.getmtime(path) for path in glob.iglob(os.path.join(REPO_PATH, '**/*.json'), recursive=True))
latest_dst = max(os.path.getmtime(path) for path in glob.iglob(os.path.join(OUTPUT_FOLDER, '*.txt')))
if latest_dst >= latest_src:
    print(f'No changes found')
    exit()

# Load the source data in all languages
print(f'Loading files...')
map: dict[str, dict[str, str]] = {}
lang_list = []
for folder in [RELEASE_FOLDER, REMOTE_FOLDER]:
    for path in glob.iglob(os.path.join(folder, '*/*.json')):
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        base = os.path.basename(path)
        lang = re.search(r'(.+)_raw\.json', base).group(1)
        if lang not in lang_list:
            lang_list.append(lang)

        for i in range(0, len(data['data']), 2):
            sid, text = data['data'][i:i+2]
            sid = make_id(sid)
            map.setdefault(sid, {})[lang] = text
        # print(f'Loaded {base}')

# Write the text files in all languages
print('Writing files...')
try:
    lang_files = {code: open(os.path.join(OUTPUT_FOLDER, f'{convert_lang(code)}_text.txt'), 'w', encoding='utf-8') for code in lang_list}
    with open(os.path.join(OUTPUT_FOLDER, 'qid_text.txt'), 'w', encoding='utf-8') as qid:
        for sid in sorted(map):
            lang_text = map[sid]
            qid.write(f'{sid}\n')
            for lang in lang_list:
                f = lang_files[lang]
                text = lang_text.get(lang, '[NULL]')
                f.write(text.replace('\\', '\\\\').replace('\n', '\\n'))
                f.write('\n')
finally:
    for f in lang_files.values():
        f.close()

print('Done!')
