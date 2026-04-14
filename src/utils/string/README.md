# Private Use Area documentation
## Official usage
| Range          | Uses                     |
|----------------|--------------------------|
| U+E000..U+E1FF | Nintendo - system font   |
| U+E000..U+E104 | Pokémon - BDSP special   |
| U+E07F..U+E0A8 | Pokémon - 3DS special    |
| U+E200..U+E2FF | *(unused)*               |
| U+E300..U+E405 | Pokémon - Switch special |
| U+E406..U+E7FF | *(unused)*               |
| U+E800..U+EE26 | Pokémon - 3DS Chinese    |
| U+EE27..U+EFFF | *(unused)*               |
| U+F000..U+F1FF | Nintendo - system font   |
| U+F000..U+F71A | Pokémon GO - Hindi/Thai  |
| U+F71B..U+F8FF | *(unused)*               |

## Poké Corpus usage
The following codepoints are used internally, and may produce unexpected output if present in input text.

Internally used in speaker/literals and passed to cleanStringPost:
- U+E700: delimiter between speaker tag and speaker name
- U+E701: delimiter between speaker name and dialogue
- U+E702: start of replaced literal
- U+E703: end of replaced literal
- U+E704: delimiter between branches in a literal
- U+E705: delimiter between literal and replacement
- U+E706: mark a gender branch in a literal
- U+E707: mark a version branch in a literal

Internally used in cleanStringPost:
- U+0080: placeholder for scroll `\r`
- U+0081: placeholder for clear `\c`
- U+0082: placeholder for new line `\n`
- U+0083: mark HTML `<br>`
- U+0084: mark a soft line break
- U+009F: start of text info
- U+EF00-EFFF: text info index

Special character escapes used in searchBoolean/cleanString:
- U+F0022: quotation mark `\"`
- U+F0028: left parenthesis `(`
- U+F0029: right parenthesis `)`
- U+F002F: literal slash `\/`
- U+F005B: left square bracket `\[`
- U+F005C: backslash `\\`
- U+F007B: left curly bracket `\{`

The following codepoints can be used in source documents for multi-valued strings:
- U+F1000: delimiter between multi-valued strings
- U+F1001: delimiter between the discriminator and the string itself
