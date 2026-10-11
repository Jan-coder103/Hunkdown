# Playable custom maps

Put JSON exported by the map editor in this folder (for example `city-draft.honkmap.json`). Any `.json` file here or in a subfolder is discovered when Vite starts/builds the game. Reload the game after adding a file; restart the dev server if a new file does not appear. A deployed/preview build must be rebuilt and redeployed.

Open the **Maps** tab, select the map by its authored name, and choose **Join round**. Both built-in maps remain available. Selection is saved in the browser profile. If a file is removed, the next page load selects Midtown without clearing progression.

Each map must have a unique document `id`. Invalid JSON/schema, duplicate IDs, or layouts without navigation connecting both team spawn regions to the objective are reported in the Maps tab and excluded. Keep open paths between the left/right team areas and the center. Renaming a file does not change its selection ID; changing the document ID does.

`city-draft.honkmap.json` is the user's exported Test City, included as a playable map. Browser downloads still use your browser's download location; move new exports here after downloading.
