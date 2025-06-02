import { readCorpus } from './corpusFs';
import { getSearchParamsFactory } from './searchParams';
import { replaceSpeaker, postprocessSpeaker, expandSpeakers } from './speaker';

test('speaker names', () => {
  const corpus = readCorpus();
  const factory = getSearchParamsFactory(corpus);

  const collection = 'ScarletViolet';
  const language = 'en';
  const lines = [
    "I’m Nemona![VAR 0114(0000)]",
    "Well, the name’s Arven.[VAR 0114(0001)]",
    "I’m Penny...[VAR 0114(0002)]",
    "I’m Carmine.[VAR 0114(0003)]",
    "I-I’m...Kieran...[VAR 0114(0004)]",
  ];
  const viewSpeaker = "View Speaker's Lines";
  const speakerNames = ["Nemona", "Arven", "Penny", "Carmine", "Kieran"];

  const lines2 = lines.map((s) => replaceSpeaker(s, speakerNames, language));
  const lines3 = lines2.map((s) => postprocessSpeaker(s));
  const lines4 = lines3.map((s) => expandSpeakers(s, factory, collection, language, viewSpeaker));
  lines4.forEach((s, i) => {
    expect(s.indexOf('<a class="speaker"')).toEqual(0);
    expect(s).toContain('href="#');
    expect(s).toContain('VAR+0114');
    expect(s).toContain(`title="${viewSpeaker}"`);
    expect(s).toContain(`${speakerNames[i]}: `);
  });
});
