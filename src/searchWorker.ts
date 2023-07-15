import 'compression-streams-polyfill';

export interface SearchParams {
  query: string,
  regex: boolean,
  caseInsensitive: boolean,
  common: boolean,
  script: boolean,
  collections: string[],
  languages: string[]
};

export interface SearchTask {
  index: number,
  params: SearchParams,
  collectionKey: string,
  fileKey: string,
  languages: string[]
}

export type SearchTaskResultError = 'error' | 'regex' | 'network';
export type SearchTaskResultDone = 'done';
export type SearchTaskResultStatus = 'loading' | 'processing' | SearchTaskResultDone | SearchTaskResultError;
export interface SearchTaskResultLines {
  collection: string,
  file: string,
  languages: string[],
  lines: string[][]
}
export interface SearchTaskResult {
  index: number,
  status: SearchTaskResultStatus,
  result?: SearchTaskResultLines
}
export interface SearchTaskResultComplete {
  index: number,
  status: SearchTaskResultDone,
  result: SearchTaskResultLines
}

export const cacheVersion = "v1";

/* eslint-disable no-restricted-globals */
self.onmessage = (task: MessageEvent<SearchTask>) => {
  //#region Helper functions
  /**
   * Attempts the following, in order:
   * - Retrieving the file from the cache
   * - Populating the cache with the file
   * - Fetching the file directly
   *
   * Returns a promise of the text of the file.
   */
  const getFileFromCache = (collectionKey: string, languageKey: string, fileKey: string) => {
    const url = process.env.PUBLIC_URL + `/corpus/${collectionKey}/${languageKey}_${fileKey}.txt.gz`;
    return caches.open(cacheVersion)
    .then((cache) => cache.match(url).then(res => res
      ?? cache.add(url).then(() => cache.match(url)).then(res => res
        ?? fetch(url))))
    .catch(() => fetch(url))
    .catch((err) => {
      console.error(err);
      notify('network');
      return null;
    })
    .then((res) => res === null ? '' :
      res.blob().then((blob) => new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()))
    .then(preprocessString);
  }

  // SMUSUM Chinese Pokémon names
  const chineseChars = '蛋妙蛙种子草花小火龙恐喷杰尼龟卡咪水箭绿毛虫铁甲蛹巴大蝶独角壳针蜂波比鸟拉达烈雀嘴阿柏蛇怪皮丘雷穿山鼠王多兰娜后朗力诺可西六尾九胖丁超音蝠走路臭霸派斯特球摩鲁蛾地三喵猫老鸭哥猴暴蒂狗风速蚊香蝌蚪君泳士凯勇基胡腕豪喇叭芽口呆食玛瑙母毒刺拳石隆岩马焰兽磁合一葱嘟利海狮白泥舌贝鬼通耿催眠貘引梦人钳蟹巨霹雳电顽弹椰树嘎啦飞腿郎快头瓦双犀牛钻吉蔓藤袋墨金鱼星宝魔墙偶天螳螂迷唇姐击罗肯泰鲤普百变伊布边菊化盔镰刀翼急冻闪你哈克幻叶月桂竺葵锯鳄蓝立咕夜鹰芭瓢安圆丝蛛叉字灯笼古然咩羊茸美丽露才皇毽棉长手向日蜻蜓乌沼太阳亮黑暗鸦妖未知图腾果翁麒麟奇榛佛托土弟蝎钢千壶赫狃熊圈熔蜗猪珊瑚炮章桶信使翅戴加象顿Ⅱ惊鹿犬无畏战舞娃奶罐幸福公炎帝幼沙班洛亚凤时木守宫森林蜥蜴稚鸡壮跃狼纹直冲茧狩猎盾粉莲童帽乐河橡实鼻狡猾傲骨燕鸥莉奈朵溜糖雨蘑菇斗笠懒獭过动猿请假居忍面者脱妞吼爆幕下掌朝北优雅勾魂眼那恰姆落正拍负萤甜蔷薇溶吞牙鲨鲸驼煤炭跳噗晃斑颚蚁漠仙歌青绵七夕鼬斩饭匙鳅鲶虾兵螯秤念触摇篮羽丑纳飘浮泡隐怨影诅咒巡灵彷徨热带铃勃梭雪冰护豹珍珠樱空棘爱心哑属艾欧盖固坐祈代希苗台猛曼拿儿狸法师箱蟀勒伦琴含羞苞槌城结贵妇绅蜜女帕兹潜兔随卷耳魅东施铛响坦铜镜钟盆聒噪陆尖咬不良骷荧光霓虹自舔狂远Ｚ由卢席恩骑色霏莱谢米尔宙提主暖炒武刃丸剑探步哨约扒酷冷蚀豆鸽高雉幔庞滚蝙螺钉差搬运匠修建蟾蜍投摔打包保足蜈蚣车轮精根裙野蛮鲈混流氓红倒狒殿滑巾征哭具死神棺原肋始祖破灰尘索沫栗德单卵细胞造鹅倍四季萌哎呀败轻蜘坚齿组麻鳗宇烛幽晶斧嚏几何敏捷功夫父赤驹劈司令炸雄秃丫首恶燃烧毕云酋迪耶塔赛里狐呱贺掘彩蓓洁能鞘芳芙妮好鱿贼脚铠垃藻臂枪伞咚碎黏钥朽南瓜嗡哲裴格枭狙射炽咆哮虎漾壬笃啄铳少强锹农胜虻鬃弱坏驴仔重挽滴伪睡罩盗着竹疗环智挥猩掷胆噬堡爷参性：银伴陨枕戈谜拟Ｑ磨舵鳞杖璞・鸣哞鳍科莫迦虚吾肌费束辉纸御机夏蛋妙蛙種子草花小火龍恐噴傑尼龜卡咪水箭綠毛蟲鐵甲蛹巴大蝶獨角殼針蜂波比鳥拉達烈雀嘴阿柏蛇怪皮丘雷穿山鼠王多蘭娜后朗力諾可西六尾九胖丁超音蝠走路臭霸派斯特球摩魯蛾地三喵貓老鴨哥猴爆蒂狗風速蚊香蝌蚪君泳士凱勇基胡腕豪喇叭芽口呆食瑪瑙母毒刺拳石隆岩馬焰獸磁合一蔥嘟利海獅白泥舌貝鬼通耿催眠貘引夢人鉗蟹巨霹靂電頑彈椰樹嘎啦飛腿郎快頭瓦雙犀牛鑽吉蔓藤袋墨金魚星寶魔牆偶天螳螂迷唇姐擊羅肯泰鯉暴普百變伊布邊菊化盔鐮刀翼急凍閃你哈克幻葉月桂竺葵鋸鱷藍立咕夜鷹芭瓢安圓絲蛛叉字燈籠古然咩羊茸美麗露才皇毽棉長手向日蜻蜓烏沼太陽亮黑暗鴉妖未知圖騰果翁麒麟奇榛佛托土弟蠍鋼千壺赫狃熊圈熔蝸豬珊瑚炮章桶信使翅戴加象頓Ⅱ驚鹿犬無畏戰舞娃奶罐幸福公炎帝幼沙班洛亞鳳時木守宮森林蜥蜴稚雞壯躍狼紋直衝繭狩獵盾粉蓮童帽樂河橡實鼻狡猾傲骨燕鷗莉奈朵溜糖雨蘑菇斗笠懶獺過動猿請假居忍面者脫妞吼幕下掌朝北優雅勾魂眼那恰姆落正拍負螢甜薔薇溶吞牙鯊鯨駝煤炭跳噗晃斑顎蟻漠仙歌青綿七夕鼬斬飯匙鰍鯰蝦兵螯秤念觸搖籃羽醜納飄浮泡隱怨影詛咒巡靈彷徨熱帶鈴勃梭雪冰護豹珍珠櫻空棘愛心啞屬艾歐蓋固坐祈代希苗台猛曼拿兒狸法師箱蟀勒倫琴含羞苞槌城結貴婦紳蜜女帕茲潛兔隨捲耳魅東施鐺響坦銅鏡鐘盆聒噪陸尖咬不良骷光霓虹自舔狂遠Ｚ由盧席恩騎色霏萊謝米爾宙提主暖炒武刃丸劍探步哨約扒酷冷蝕豆鴿高雉幔龐滾蝙螺釘差搬運匠修建蟾蜍投摔打包保足蜈蚣車輪毬精根裙野蠻鱸混流氓紅倒狒殿滑巾徵哭具死神棺原肋始祖破灰塵索沫栗德單卵細胞造鵝倍四季萌哎呀敗輕蜘堅齒組麻鰻宇燭幽晶斧嚏幾何敏捷功夫父赤駒劈司令炸雄禿丫首惡燃燒畢雲酋迪耶塔賽里狐呱賀掘彩蓓潔能鞘芳芙妮好魷賊腳鎧垃藻臂槍傘咚碎黏鑰朽南瓜嗡哲裴格梟狙射熾咆哮虎漾壬篤啄銃少強鍬農勝虻鬃弱壞驢仔重挽滴偽睡罩盜著竹療環智揮猩擲膽噬堡爺參性：銀伴隕枕戈謎擬Ｑ磨舵鱗杖璞・鳴哞鰭科莫迦虛吾肌費束輝紙御機夏垒磊砰奥壘磊砰丑奧';
  const remapChineseChars = (s: string) => {
    return s.search(/[\uE800-\uEE26]/u) === -1 ? s : (
      Array.from(s).map((c) => {
        const codePoint = c.codePointAt(0);
        return (codePoint !== undefined && codePoint >= 0xE800 && codePoint <= 0xEE26) ? chineseChars[codePoint - 0xE800] : c;
      }).join('')
    );
  }

  // ORAS Korean Braille
  const remapKoreanBraille = (s: string) => {
    return s.search(/[\u1100-\u11FF\uE0C0-\uE0C7]/u) === -1 ? s : (s
      .replaceAll('\uE0C0', '그래서') // geuraeseo
      .replaceAll('\uE0C1', '그러나') // geureona
      .replaceAll('\uE0C2', '그러면') // geureomyeon
      .replaceAll('\uE0C3', '그러므로') // geureomeuro
      .replaceAll('\uE0C4', '그런데') // geureonde
      .replaceAll('\uE0C5', '그') // UNUSED go
      .replaceAll('\uE0C6', '그리하여') // geurihayeo
      .replaceAll('ᆨᅩ', '그리고') // geurigeo
      .replaceAll('\uE0C7ᄉ', 'ᄊ') // ss
      .replaceAll('\uE0C7ᄀ', 'ᄁ') // kk
      .replaceAll('\uE0C7ᄃ', 'ᄄ') // tt
      .replaceAll('\uE0C7ᄇ', 'ᄈ') // pp
      .replaceAll('\uE0C7ᄌ', 'ᄍ') // jj
      .replaceAll('\uE0C7', 'ᄉ') // unmatched double consonant
      .replaceAll(/([\u1100-\u115F])([억옹울옥연운온언얼열인영을은])/gu, (_, initial: string, syllable: string) => initial + syllable.normalize("NFD").substring(1)) // combine initial with abbreviations
      .replaceAll(/([가나다마바사자카타파하])([\u11A8-\u11FF])/gu, (_, syllable: string, final: string) => syllable.normalize("NFD") + final) // combine abbreviations with final
      .replaceAll(/^[\u1160-\u1175]+$/gum, (match) => '\u115F' + match.split('').join('\u115F')) // filler for unmatched vowels in strings of unmatched vowels
      .replaceAll(/(?<![\u1100-\u115F])([\u1160-\u1175])/gu, 'ᄋ$1') // add null initial to all other unmatched vowels
      .replaceAll(/([\u1100-\u115F])(?![\u1160-\u1175]|$)/gum, '$1\u1160') // filler for unmatched initials
      .replaceAll(/(?<![\u1160-\u1175])([\u11A8-\u11FF])/gum, '\u115F\u1160$1') // filler for unmatched finals
      .normalize()
    );
  }

  // NDS special characters
  const remapNDSSpecialCharacters = (s: string) => {
    return s.search(/[\u2460-\u2487]/u) === -1 ? s : (s
      .replaceAll('\u2469', 'ᵉʳ') // Gen 5 superscript er
      .replaceAll('\u246A', 'ʳᵉ') // Gen 5 superscript re
      .replaceAll('\u246B', 'ʳ') // Gen 5 superscript r
      .replaceAll('\u2485', 'ᵉ') // Gen 5 superscript e
    );
  }

  // 3DS special characters
  const remap3DSSpecialCharacters = (s: string) => {
    return remapChineseChars(remapKoreanBraille(
      s.search(/[\uE000-\uE0A8]/u) === -1 ? s : (s
        // System
        .replaceAll('\uE000', 'Ⓐ') // A Button
        .replaceAll('\uE001', 'Ⓑ') // B Button
        .replaceAll('\uE002', 'Ⓧ') // X Button
        .replaceAll('\uE003', 'Ⓨ') // Y Button
        .replaceAll('\uE004', 'Ⓛ') // L Button
        .replaceAll('\uE005', 'Ⓡ') // R Button
        .replaceAll('\uE006', '✜') // Control Pad
        .replaceAll('\uE073', '🏠︎') // Home Button

        // Pokémon private use
        .replaceAll('\uE08A', 'ᵉʳ') // Superscript er
        .replaceAll('\uE08B', 'ʳᵉ') // Superscript re
        .replaceAll('\uE08C', 'ʳ') // Superscript r
        .replaceAll('\uE092', '♥') // Halfwidth eighth note
        .replaceAll('\uE09A', '♪') // Halfwidth eighth note
        .replaceAll('\uE0A6', 'ᵉ') // Superscript e

        // ORAS Braille
        .replaceAll('\uE081', '.') // French period (dots-256) [UNUSED]
        .replaceAll('\uE082', ',') // French comma (dots-2) [UNUSED]
        .replaceAll('\uE083', '.') // Italian period (dots-256) [UNUSED]
        .replaceAll('\uE084', ',') // Italian comma (dots-2) [UNUSED]
        .replaceAll('\uE085', '.') // German period (dots-3)
        .replaceAll('\uE086', ',') // German comma (dots-2) [UNUSED]
        .replaceAll('\uE087', '.') // Spanish period (dots-3)
        .replaceAll('\uE088', ',') // Spanish comma (dots-2) [UNUSED]
      )
    ));
  }

  // Switch special characters
  const remapSwitchSpecialCharacters = (s: string) => {
    return s.search(/[\uE300-\uE31C]/u) === -1 ? s : (s
      .replaceAll('\uE300', '$') // Pokémon Dollar
      .replaceAll('\uE301', 'A') // Unown A
      .replaceAll('\uE302', 'B') // Unown B
      .replaceAll('\uE303', 'C') // Unown C
      .replaceAll('\uE304', 'D') // Unown D
      .replaceAll('\uE305', 'E') // Unown E
      .replaceAll('\uE306', 'F') // Unown F
      .replaceAll('\uE307', 'G') // Unown G
      .replaceAll('\uE308', 'H') // Unown H
      .replaceAll('\uE309', 'I') // Unown I
      .replaceAll('\uE30A', 'J') // Unown J
      .replaceAll('\uE30B', 'K') // Unown K
      .replaceAll('\uE30C', 'L') // Unown L
      .replaceAll('\uE30D', 'M') // Unown M
      .replaceAll('\uE30E', 'N') // Unown N
      .replaceAll('\uE30F', 'O') // Unown O
      .replaceAll('\uE310', 'P') // Unown P
      .replaceAll('\uE311', 'Q') // Unown Q
      .replaceAll('\uE312', 'R') // Unown R
      .replaceAll('\uE313', 'S') // Unown S
      .replaceAll('\uE314', 'T') // Unown T
      .replaceAll('\uE315', 'U') // Unown U
      .replaceAll('\uE316', 'V') // Unown V
      .replaceAll('\uE317', 'W') // Unown W
      .replaceAll('\uE318', 'X') // Unown X
      .replaceAll('\uE319', 'Y') // Unown Y
      .replaceAll('\uE31A', 'Z') // Unown Z
      .replaceAll('\uE31B', '!') // Unown !
      .replaceAll('\uE31C', '?') // Unown ?
    );
  }

  /**
   * Appends additional metadata to each string:
   * - For strings with ruby, appends copies of the strings with the ruby text converted to kana/kanji so that they can be searched.
   *   These copies are separated by `U+F0000` and `U+F0001` so that they can be stripped before display.
   *
   * Returns the resulting string.
   */
  const preprocessMetadata = (s: string) => {
    return s.search(/\{[^|}]+\|[^|}]+\}/u) === -1 ? s : (
      s.replaceAll(/^.*\{[^|}]+\|[^|}]+\}.*$/gum, (line) => {
        const lineKanji = line.replaceAll(/\{([^|}]+)\|[^|}]+\}/gu, '$1');
        const lineKana = line.replaceAll(/\{[^|}]+\|([^|}]+)\}/gu, '$1');
        return [line, '\u{F0000}', lineKanji, '\u{F0001}', lineKana].join('');
      })
    );
  }

  /**
   * Converts private use characters to the corresponding Unicode characters,
   * and adds additional searchable metadata.
   *
   * Returns the resulting string.
   */
  const preprocessString = (s: string) => {
    return preprocessMetadata(remapSwitchSpecialCharacters(remap3DSSpecialCharacters(remapNDSSpecialCharacters(s))));
  }

  /**
   * Strips additional metadata from each string:
   * - Converted ruby text marked with `U+F0000` and `U+F0001`
   *
   * Returns the resulting string.
   */
  const postprocessMetadata = (s: string) => {
    return s.split('\u{F0000}')[0];
  }

  /**
   * Converts the provided string to HTML by escaping `<` and `>`,
   * replacing line break control characters such as  `\n` with `<br>`,
   * and converting the ruby syntax `{base|ruby}` to the corresponding HTML tags.
   *
   * Returns the resulting HTML string.
   */
  const postprocessString = (s: string) => {
    return (postprocessMetadata(s)
      .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('\u2486', '<sup>P</sup><sub>K</sub>') // Gen 5 PK
      .replaceAll('\u2487', '<sup>M</sup><sub>N</sub>') // Gen 5 MN
      .replaceAll('\uE0A7', '<sup>P</sup><sub>K</sub>') // 3DS PK
      .replaceAll('\uE0A8', '<sup>M</sup><sub>N</sub>') // 3DS MN
      .replaceAll(/\[VAR FF01\(FF43\)\]\[VAR FF01\(30B3\)\]/gu, '')
      .replaceAll(/\[VAR FF01\(FF43\)\](.+?)(?:\[VAR FF01\(30B3\)\]|\\r|\\c|\\n|$)/gu, '<span class="line-font-size-200"><span class="text-font-size-200">$1</span></span>')
      .replaceAll('[VAR FF01(30B3)]', '')
      .replaceAll(/\[VAR 0205\](.*?(?:\\r|\\c|\\n|$)+)/gu, '<span class="line-align-center">$1</span>')
      .replaceAll(/\[VAR 0206\](.*?(?:\\r|\\c|\\n|$)+)/gu, '<span class="line-align-right">$1</span>')

      // Line breaks
      .replaceAll('[VAR 0207]\\n', '<span class="c">&#91;VAR 0207&#93;</span><span class="n">&#92;n</span><br>')
      .replaceAll('[VAR 0208]\\n', '<span class="r">&#91;VAR 0208&#93;</span><span class="n">&#92;n</span><br>')
      .replaceAll('\\r\\n', '<span class="r">&#92;r</span><span class="n">&#92;n</span><br>')
      .replaceAll('\\c\\n', '<span class="c">&#92;c</span><span class="n">&#92;n</span><br>')
      .replaceAll('[VAR 0207]', '<span class="c">[VAR 0207]</span>')
      .replaceAll('[VAR 0208]', '<span class="r">[VAR 0208]</span>')
      .replaceAll('\\r', '<span class="r">&#92;r</span><br>')
      .replaceAll('\\c', '<span class="c">&#92;c</span><br>')
      .replaceAll('\\n', '<span class="n">&#92;n</span><br>')

      .replaceAll('\t', '<span class="tab">\t</span>')
      .replaceAll('[NULL]', '<span class="null">[NULL]</span>')
      .replaceAll('[COMP]', '<span class="compressed">[COMP]</span>')
      .replaceAll(/(\[VAR [^\]]+?\])/gu, '<span class="var">$1</span>')
      .replaceAll(/(\[WAIT \d+\])/gu, '<span class="wait">$1</span>')
      .replaceAll(/(\[~ \d+\])/gu, '<span class="unused">$1</span>')
      .replaceAll(/\{([^|}]+)\|([^|}]+)\}/gu, '<ruby>$1<rp>(</rp><rt>$2</rt><rp>)</rp></ruby>') // Switch furigana
      .replaceAll(/^(\s+)$/gu, '<span class="whitespace">$1</span>')
    );
  };
  //#endregion

  const {index, params, collectionKey, fileKey, languages} = task.data;
  const notify = (status: SearchTaskResultStatus, result?: SearchTaskResultLines) => {
    const message: SearchTaskResult = {
      index: index,
      status: status,
      result: result
    }
    postMessage(message);
  }

  let re: RegExp | null = null;
  try {
    if (params.regex) {
      re = new RegExp(params.query, params.caseInsensitive ? 'ui' : 'u');
    }
  }
  catch (err) {
    console.error(err);
    notify('regex');
    return;
  }

  const matchCondition = (line: string): boolean => {
    return (params.regex && re !== null && line.match(re) !== null)
      || (!params.regex && !params.caseInsensitive && line.includes(params.query))
      || (!params.regex && params.caseInsensitive && (line.toLowerCase().includes(params.query.toLowerCase()) || line.toUpperCase().includes(params.query.toUpperCase())));
  };

  try {
    // Load files
    const filePromises = languages.map((languageKey) => getFileFromCache(collectionKey, languageKey, fileKey).then((data) => [languageKey, data] as [string, string]));
    filePromises.forEach((promise) => promise.then(() => notify('loading')).catch(() => {})); // for progress bar

    // Process files
    const processingFilePromises = filePromises.map((promise) => promise.then(([languageKey, data]) => {
      const lines = data.split(/\r\n|\n/);
      const lineKeys: number[] = [];

      // Check selected languages for lines that satisfy the query
      if (params.languages.includes(languageKey)) {
        lines.forEach((line, i) => {
          if (matchCondition(line)) {
            lineKeys.push(i);
          }
        });
      }
      return [languageKey, lineKeys, lines] as [string, number[], string[]];
    }));
    processingFilePromises.forEach((promise) => promise.then(() => notify('processing')).catch(() => {})); // for progress bar

    // Filter only the lines that matched
    Promise.all(processingFilePromises).then((processedFiles) => {
      const languageKeys: string[] = [];
      const lineKeysSet: Set<number> = new Set();
      const fileData: string[][] = [];

      processedFiles.forEach(([languageKey, lineKeys, lines]) => {
        languageKeys.push(languageKey);
        lineKeys.forEach((i) => lineKeysSet.add(i));
        fileData.push(lines);
      });

      const fileResults: string[][] = [];
      Array.from(lineKeysSet).sort((a, b) => a - b).forEach((i) => fileResults.push(fileData.map((lines) => postprocessString(lines[i] ?? ''))));
      notify('done', {
        collection: collectionKey,
        file: fileKey,
        languages: languageKeys,
        lines: fileResults,
      });
    })
    .catch((err) => {
      console.error(err);
      notify('error');
    });
  }
  catch (err) {
    console.error(err);
    notify('error');
  }
};
