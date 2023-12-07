# Poké Corpus
**Tool to query the Pokémon corpus**

Visit at [abcboy101.github.io/poke-corpus/](https://abcboy101.github.io/poke-corpus/)


## How to use
1. Enter your search query into the "Query:" box.
   - By default, a line matches the query if it contains the query anywhere.
     If you want to search using a regular expression, make sure that the "Regex" box is checked.
   - By default, the search is case-insensitive.
     If you want to perform a case-sensitive search, make sure that the "Case sensitive" box is not checked.
   - By default, the search will search both the common text (interface text, names, descriptions) and the script text (story-related text, dialogue, etc.).
     If you want to limit your search, uncheck the relevant box.
2. Select the games whose text you would like to search.
3. Select the languages whose text you would like to search.
4. Click "Search".
5. The search results will appear in the window.
   - If there are results from multiple games, you can jump to a particular game's results using the "Jump to..." dropdown.
   - You can share a link to a particular line using the arrow icon.
   - You can view nearby lines using the paper with lines icon.

Near the top right of the results window are several buttons.
- The button with a "[ ]" icon will show/hide variables.
- The button with a "¶" icon will show/hide all characters, including line breaks.
- The button with a "⚥" icon will change whether lines for the male or female player are displayed.
  The available options are both players separated by a slash (⚥), male (♂), or female (♀).
- The button with a "#" icon will change whether singular or plural forms are displayed.
  The available options are both forms separated by a slash (#), singular (1), or plural (>1).

You can change your selected language and colorscheme using the dropdowns in the top right.


## Local setup
You will need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.
To run the tool locally, clone the repository and run the following commands in the project directory:
```commandline
npm ci
npm start
```
