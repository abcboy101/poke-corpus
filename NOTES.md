# Notes
## Text file format
Most text dumps in this repo use the common format shared by [xytext](https://github.com/kwsch/xytext), [pk3DS](https://github.com/kwsch/pk3DS), and [pkNX](https://github.com/kwsch/pkNX).

The text dumps from the NDS games have been converted to the standard format, with the following extensions:
- Compressed strings are decompressed and marked with `[COMP]` instead of `\c`.
- `[NULL]` is used as a placeholder for lines and files which do not exist in a particular language version.
- `<sup>P</sup><sub>K</sub><sup>M</sup><sub>N</sub>` in the Generation IV games are encoded using `⒆⒇` as in the Generation V games.
- The bag icons in the Generation IV games are encoded using `♈♌♎♊♍♋♏♉` as in [PKHeX](https://github.com/kwsch/PKHeX).

The text dumps for Brilliant Diamond/Shining Pearl have been converted to the standard format, with the following extensions:
- The arguments for variables may include named parameters and `|`-delimited arrays of strings, such as in `[VAR 1300(tagParameter=255,tagWordArray=he|she)]`.
  (This is equivalent to `[VAR 1100(00FF,0100)]she` in other games.)
- `[WAIT]` takes a float as an argument instead of an integer.
- `[SFX]` takes a float as an argument. (This is equivalent to `[VAR BE05]` in other games.)
- The Unity rich text tags `<color>`, `<position>`, `<line-indent>`, and `<size>` are used to format text.

The text dumps from the GB, GBC, and GBA games were done by [RobbiRobb](https://robbirobb.de/spiele).
As these games do not have a file system like later games, these text dumps include other data interpreted as text.
These dumps are included unmodified.

The text dumps from the GCN games were done by [Tiddlywinks](https://bulbapedia.bulbagarden.net/wiki/User:Tiddlywinks), with the following changes:
- The text data has been formatted to align based on their IDs. IDs with multiple corresponding strings are displayed together using an HTML description list.
- Variables and special characters are marked with square brackets instead of curly braces.
- `{newline}` and `{clear_window}` are replaced with `\n` and `\c`.
- Furigana is converted to the `{kanji|kana}` format.
- The `{{null}}` terminator is stripped.