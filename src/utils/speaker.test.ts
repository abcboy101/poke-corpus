import { replaceSpeaker, postprocessSpeaker } from './speaker';

test('speaker names', () => {
  const language = 'en';
  const lines = [
    "I’m Nemona![VAR 0114(0000)]",
    "Well, the name’s Arven.[VAR 0114(0001)]",
    "I’m Penny...[VAR 0114(0002)]",
    "I’m Carmine.[VAR 0114(0003)]",
    "I-I’m...Kieran...[VAR 0114(0004)]",
  ];
  const speakerNames = ["Nemona", "Arven", "Penny", "Carmine", "Kieran"];

  const lines2 = lines.map((s) => replaceSpeaker(s, speakerNames, language));
  const lines3 = lines2.map((s) => postprocessSpeaker(s));
  lines3.forEach((s, i) => {
    expect(s.indexOf('<text-info class="speaker"')).toEqual(0);
    expect(s).toContain('data-start="\\[VAR 0114');
    expect(s).toContain(`${speakerNames[i]}: `);
  });
});
