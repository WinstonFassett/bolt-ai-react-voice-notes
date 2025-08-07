This codebase:
- began as a fork of Say by Addy Osmani
- was vibecoded on bolt.new,and on laptop with windsurf and cursor
- is a bit of a mess of paradigms, patterns, old and new code
- has an improvised UI instead of an idiomatic one built from real components (like shad ui etc)
- has improvised routing that seems to jump to bottom of page when you navigate
- was refactored to put state into Zustand stores but the AIs we not entirely consistent
- uses milkdown's crepe editor instead of tinymce, for rich markdown editing
- uses call-ai for LLMs
- uses @xenova/transformers for local LLMs
- supports multiple LLM providers and models -- and I'm not sure if it's worth it
- uses IndexedDB for audio storage. aside: OPFS would be better
- has a decent dark theme but I want dark/light with toggle and following browser pref by default
- needs to consistently format "markdown snippets" that are truncated bits of markdown docs. does this in some places but not others
- has tags but not much UI around tags. at least search will find them
- library view is clunky. could probably be 2 col on widescreen. or could move towards a sidebar for doc nav
- sticky headers for This Month etc might be nice
- on mobile i have to tap takeaway card 2x to get it opened
- text could be a bit smaller on mobile. headers seem a little large in lib view. icons too
- want better nav dealing with note detail view, which stays atop lib when you leave/come back, but should prob go to list view in that case.
- when showing persistent floating ui ie for recording or playback, the views need to know that and adjust their layout ie with extra bottom space to allow scrolling things fully.
- agents screen is not great on mobile. poor uses of space, ie empty space below autorun buttons. not sure about the panel at the top. kinda weird. not sure i like showing tags here. buitlin badge can go below icon maybe. 
- settings for providers has redundant copy/headings
- test button makes no sense to me if we are auto testing
- it should auto select or prompt them to select a model once they add a valid provider
- data management is too wide on mobile. should allow wrap, perhaps 2 cols of action buttons. below headings instead of alongside.
- move app data warning stuff into dialog that we show to confirm
- not sure if debug log is working. was originally for troubleshooting audio and has not been used in a while.
- buttons have no click behavior. should scale to .97 or smth. Import button has no focus outline, or it is blending with bg.
- provider/model setup and model selection is something I would prefer to externalize if i can find a good component / lib for reference info 

Also
- has trouble running on iOS esp with large files

The Task:

Review codebase and create detailed inventory for redesign.
It should describe all the existing code that the redesign should expect to use. 
Meaning we don't need store redesigns, it can just presume not to change those.
What I would like to try is a clean redesign without providing codebase to the tool and then integrate based on the stores/paths/apis that we share with it. What we need here is an inventory of the stores and services and logic that are already there and what they are called / how to use them. It should describe the information architecture and general content of screens ie enough for wireframes. but I want the design tools to take it from there.

The inventory should include:

- stores and services and logic that are already there and what they are called / how to use them.
- information architecture and general content of screens ie enough for wireframes.
- any other relevant information that the tool might need to know about the codebase.

The inventory should be in markdown format and should be easy to read and understand. It should be easy to update and maintain. It should be easy to share with the team.

The redesign inventory should be in a file called REDESIGN.md in the root of the project.

It does not need to describe UI components, only stores and services and logic that are already there and what they are called / how to use them.
