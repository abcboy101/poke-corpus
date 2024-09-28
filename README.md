# Poké Corpus
**Tool to query the Pokémon corpus**

Visit at [abcboy101.github.io/poke-corpus/](https://abcboy101.github.io/poke-corpus/)


## How to use
1. Enter your search query into the "Query:" box.
   - By default, a line matches the query if it contains the exact phrase anywhere.
     If you want to search using a regular expression, select "Regex" using the dropdown.
     If you want to search using a Boolean expression, select "Boolean" using the dropdown.
   - By default, the search is case-insensitive.
     If you want to perform a case-sensitive search, make sure that the "Case sensitive" box is not checked.
   - By default, the search will search both the common text (interface text, names, descriptions) and the script text (story-related text, dialogue, etc.).
     If you want to limit your search, uncheck the relevant box.
2. Click "Filters" to display the list of filters.
   Select the games and languages you would like to search.
3. Click "Search".
4. The search results will appear in the window.
   - If there are results from multiple games, you can jump to a particular game's results using the "Jump to..." dropdown.
   - You can share a link to a particular line using the arrow icon.
   - You can view nearby lines using the paper with lines icon.
   - For certain games, the speaker's name will be displayed in gray at the start of the line.
     Click their name and click "Search" to view other lines said by the same person.

Near the top right of the results window are several buttons.
- The button with a "[ ]" icon will show/hide variables.
- The button with a "¶" icon will show/hide all characters, including line breaks.
- The button with a "⚥" icon will change whether lines displayed for the male player/using masculine grammatical gender,
  or lines displayed for the female player/using feminine grammatical gender are displayed.
  The available options are all forms separated by a slash (⚥), male (♂), or female (♀).
  - In German, some lines can use neuter grammatical gender; these forms are displayed when all forms are displayed.
- The button with a "#" icon will change whether singular or plural forms are displayed.
  The available options are both forms separated by a slash (#), singular (1), or plural (>1).
- The button with a "ᵃᵇᶜ" icon will show/hide furigana and ruby text.

By clicking the "Options" button in the top right, you can change:
- The interface language
- The colorscheme
- Whether to use long URLs
- How many results to show per page

By clicking the "Manage cache" link in the footer, you can view and delete downloaded text files.


## Advanced
When performing a Boolean search, you can append a `WHERE` clause to filter based on a comparison between two languages.
For example, you could use `WHERE ja = en` to find lines where the "Japanese (Kanji)" and "English" text are the same,
or use `WHERE en <> en-GB` to find lines that differ between "English" and "English (UK)".
The operators `==` and `!=` are also supported.
A full list of supported language codes can be found [here](src/res/corpus.json).

Please note that URLs are not guaranteed to be stable, and that a given URL may stop working in the future.
URLs can be invalidated when new features, games, or languages are added.


## Local setup
You will need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
To run the tool locally, clone the repository and run the following commands in the project directory:
```commandline
npm ci
npm start
```
