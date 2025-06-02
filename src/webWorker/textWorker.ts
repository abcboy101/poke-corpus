import { codeId, Literals } from "../utils/corpus";
import { replaceSpeaker } from "../utils/speaker";
import { postprocessString } from "../utils/string/cleanStringPost";
import { replaceLiteralsFactory } from "../utils/string/literals";
import { SearchTaskResultLines } from "./searchWorker";

export interface TextTask extends SearchTaskResultLines {
  readonly index: number,
  readonly richText: boolean,
  readonly corpusLiterals?: Literals,
}

export interface TextResult extends TextTask {
  readonly error?: true,
}

self.onmessage = (task: MessageEvent<TextTask>) => {
  try {
    const {collection, languages, richText, speakers, literals, lines, corpusLiterals} = task.data;
    const replaceLiterals = replaceLiteralsFactory(literals, languages.indexOf(codeId), collection, languages, corpusLiterals);
    const result: TextResult = {
      ...task.data,
      lines: lines.map((row) => row.map((s, j) => {
        if (richText) {
          if (speakers.length > 0)
            s = replaceSpeaker(s, speakers[j], languages[j]);
          s = replaceLiterals(s, j);
        }
        s = postprocessString(s, collection, languages[j], richText);
        return s;
      })),
    };
    postMessage(result);
  }
  catch (err) {
    console.error(err);
    const result: TextResult = {...task.data, richText: false, error: true};
    postMessage(result); // fall back to unprocessed text
  }
};
