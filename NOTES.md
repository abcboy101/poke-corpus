# Notes
## Format
### Special syntax
For all text dumps in the standard format, the following brackets mark modified representations of the original data:
- Text within square brackets mark variables and functions.
  - When searching, you can search for the variable syntax directly, such as `[VAR 0100(0000)]`.
    When using regular expressions, you will need to escape the syntax as `\[VAR 0100\(0000\)\]`.
- Text within curly brackets represent furigana in the `{kanji|kana}` format.
  - When searching, the string will match if the furigana syntax matches, the kanji match, or the kana match.
    For example, if you were searching for a line that includes <ruby>一<rp>(</rp><rt>ひと</rt><rp>)</rp></ruby>つ, all three of these queries will match: `{一|ひと}つ`, `ひとつ`, `一つ`.
  - When using regular expressions, you will need to escape the syntax, such as `\{一\|ひと\}つ`.

### Escape sequences
For all text dumps in the standard format, there are six escape sequences:
- `\n` represents a line break.
  - When searching, you can search for `\n` directly.
  - When using regular expressions, it is converted to a line feed (`\n`).
- `\r` represents a prompt to press a button; upon tapping it, it scrolls the current dialogue up one line.
  - When searching, you can search for `\r` directly.
  - When using regular expressions, it is converted to a carriage return (`\r`).
- `\c` represents a prompt to press a button; upon tapping it, the dialogue box is cleared.
  - When searching, you can search for `\c` directly.
  - When using regular expressions, it is converted to a form feed (`\f`).
- `\\` represents a literal backslash.
  - When searching, you can search for `\\` directly.
    (Searching for `\` on its own will match any escape sequence.)
  - When using regular expressions, you will need to double-escape it as `\\\\`.
- `\[` represents a literal left square bracket.
  - When searching, you can search for `\[` directly.
    (Searching for `[` on its own will match variable syntax.)
  - When using regular expressions, you will need to double-escape it as `\\\[`.
- `\{` represents a literal left curly bracket.
  - When searching, you can search for `\{` directly.
    (Searching for `{` on its own will match furigana syntax.)
  - When using regular expressions, you will need to double-escape it as `\\\{`.

### Special characters
- Use `$` for the Pokémon Dollar sign.
- Use `⒆⒇` for <sup>P</sup><sub>K</sub><sup>M</sup><sub>N</sub>.
- Use `ᵉʳ`, `ʳᵉ`, `ʳ`, `ᵉ` for the ordinals.
- Use `Ⓐ`, `Ⓑ`, `Ⓧ`, `Ⓨ`, `Ⓛ`, `Ⓡ`, `✜`, `🏠︎` for the Nintendo 3DS buttons.
- Use `①`, `②`, `③`, `④` for the PictoChat neutral, happy, sad, and angry faces.
- Use `✨︎` for the sparkles used for the differently-colored statues in BDSP.

## Sources and changes made
Most text dumps in this repo use the common format shared by [xytext](https://github.com/kwsch/xytext), [pk3DS](https://github.com/kwsch/pk3DS), and [pkNX](https://github.com/kwsch/pkNX).

### NDS
The text dumps from the NDS games have been converted to the standard format, with the following extensions to the format:
- Compressed strings are decompressed and marked with `[COMP]` instead of `\c`.
- `[NULL]` is used as a placeholder for lines and files which do not exist in a particular language version.
- <sup>P</sup><sub>K</sub><sup>M</sup><sub>N</sub> in the Generation IV games is encoded using `⒆⒇` as in the Generation V games.
- The bag icons in the Generation IV games are encoded using `♈♌♎♊♍♋♏♉` as in [PKHeX](https://github.com/kwsch/PKHeX).

### BDSP
The text dumps for Brilliant Diamond/Shining Pearl have been converted to the standard format, with the following extensions to the format:
- The arguments for variables may include named parameters and `|`-delimited arrays of strings, such as in `[VAR 1300(tagParameter=255,tagWordArray=he|she)]`.
  (This is equivalent to `[VAR 1100(00FF,0100)]she` in other games.)
- `[WAIT]` takes a float as an argument instead of an integer.
- `[SFX]` takes a float as an argument. (This is equivalent to `[VAR BE05]` in other games.)
- The Unity rich text tags `<color>`, `<position>`, `<line-indent>`, and `<size>` are used to format text.

### GB/GBC/GBA
The text dumps from the GB, GBC, and GBA games were done by [RobbiRobb](https://robbirobb.de/spiele).
As these games do not have a file system like later games, these text dumps include other data interpreted as text.
These dumps are included unmodified.

### GCN
The text dumps from the GCN games were done by [Tiddlywinks](https://bulbapedia.bulbagarden.net/wiki/User:Tiddlywinks), with the following changes:
- The text data has been formatted to align based on their IDs. IDs with multiple corresponding strings are displayed together using an HTML description list.
- Variables and special characters are marked with square brackets instead of curly braces.
- `{newline}` and `{clear_window}` are replaced with `\n` and `\c`.
- Furigana is converted to the `{kanji|kana}` format.
- The `{{null}}` terminator is stripped.
