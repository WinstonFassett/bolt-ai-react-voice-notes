# The Rules

Don't fucking rewrite shit that is working. 
The user HATES it when you run the dev server and consumer their ports because they are ALWAYS running the dev server and testing and WAITING on you.
Instead tell the user what to test and don't be fluffy. 
Do not sweat TS warnings about unused things. Come on. The goal is to make things work. This is the real world. Be expedient.


# UX Issues


- [*] The bottom navigation has no max width and extends to the edges of the screen


Sticky title on note would be nice because title is not in app bar.
Or could consider putting title in app bar and truncating
maybe keep the meta stuff sticky as well, together with title.

Detail screen does not match redesign yet
Mainly missing the add button which should probably be our same global add button / dropdown, but it adds a child note.
Redesign also had a  left right nav button thing I did not fully understand. Ah maybe it cycles through descendants? Not sure if it makes sense.
I guess maybe it's useful that we have it for navigation between notes but it would be best to also have that nav on library screen for consistency, I think. Need to discuss before changing.

Recording length has been lost somewhere. And that breaks the playback progress bar. 
It is working on MAIN. Not sure where we lost it.

Playback being open should NOT block pressing record. In that case playback should cease before starting recording.
Record being open SHOULD disable all playback buttons.

There used to be a way to cancel out of recording without creating a note and now it's not possible.

Would be nice if copy markdown button was fixed in upper right of markdown, even when scrolling.

The add circle button doesn't really fit our shad style. It's too tall for the header. Needs to be smaller circle in order to have some space around it. Could try a button icon if nothing else works. Main issue with current button is size. 

I actually prefer some elements of the old card ui in library, but want to be consistent with style from redesign. 
Things I would like back:
- multiline card header with 
  - play button icon col
  - text col
    - title row: title, spacer, delete button
    - info row: date, duration, X takeaways
    - tags row
    - preview row
- play button on the left, larger, approx hight

Detail view headers should have some consistency with library view headers.


On library view cards, top level cards have no separation from children below them. looks cramped.

AI Generated Content section should have Run AI agents button on same level as header but able to wrap.  
And that copy button should be floating / sticky in upper right of markdown editor. 

Clicking a tag should open to library route and put that tag in the query. Also in the route for bookmarking. 

Searching should work this same way, updating the route. Should not really need debouncing imo. 

These things are not necessary and can be removed: └─ 
Do remember to color left side of bot cards like in redesign.


The headers are not consistent across the tabs. The agents tab is ok and the circle button fits in that header, but it all needs to be updated to match the library and detail screens. The headers should be consistent. 

Settings should have a fixed Settings header and I think the section headers should be sticky. 

The AI Agents is messy. LLM providers should get its own section and be first. AI Agents is actually not the setting. I guess we can have a section for ai agents where it can change the default model for agents. The rest I think goes in LLM Providesr, first section. Remove test button on llm provider. 
transcription model selector can be in row with label but allow it to wrap to another row and ful width on sm screens.

Make settings checkboxes consistent. I like aving them in same row with label. Also prefer switches to checkboxes. Can pull from shad cnui if we don't alseadyu have a switch here.

Data management settings need help on smallest screens. Buttons should be allowed to wrap. Headings preceding buttons should get their own line. 

Clear App data should get all chat copy reloacated inside the dialog it opens. 
Downloaded models are not really danger zone, they are cache.

I don't think the debug log makes sense. We should just remove that. Don't really need an about section. yet. 

Make the X providers connected message more compact, like a single row on desktop with space between texts, and allow wrap on sm screens, and left align in that case.

---

# Testing Results So Far

1: fail. 2: added in wrong place. Add to library now. 3. Tag click failed on ai takewawy tag. 
4. pass

note 
1. pass
2. yes but left a dupe header above it and also a dupe secton above that


note has

Related notes (lists ai takeaways)
Recent AI Takeaways (lists ai takeaways)
AI Tools | Run AI Agents

This is BAD.

There should only be Child Notes or what I call Takeaways.
No fucking related notes.
No fucking AI tools.
Put the ai button in row with Takeaways for pete's sake.

Formatting of cards in related notes IS better for the card part than in recent ai takeaways. BUT recent ai takewawyas card CONTENT IS better than related notes card content. (header, markdown, delete button) are better.

Really this should use the same damn idiomatic card tree UX from the library list view, right???


Styling is not great. Color seems to bright. Library view has it more right for these cards / trees than the others.

Don't hae duplicated lists of notes in the note detail. one list of notes, formatted like library does it. we are sort of nested in a library view, get it?

General testing:
Nav flow is ok, responsive design is ok. Func is ok. 

Remember to format markdown snippets. We weren't doing it consistently so where we aren't, like in the library card view, fix it, based on where we ARE doing it, like in the detail view listing child notes.

# Inbox

There is no was to cancel a recording anymore. Restore it. Was present on main. 

Testing with a light desktop theme know, I can see theming needs work
It's inconsistent.
In light mode
- Record tab  tab is ok
- But record widget is dark. Needs to do both.
- Library looks Ok but create note dropdown is dark. needs to do both.
- create note button is too big has no space around it in header.
- library header looks weird when dropdown open
- Note detail is dark. Needs to do both. Needs to be consistent.
- Card tree on note detail is light (correct)
- Footer nav is weird. white on inside and buttons but translucent around that, so sides
- Run AI Agents dialog remained dark 
- agents is light, looks weird though. not correct. no borders. weird hover bg shows no padding. agents read panel similar weirdness.
- Edit agent dialog is dark. needs to do both. 
- Settings remained dark. needs to do both. 
- Also provider dialog is dark. Needs to do both.

- CLicking agent title should open edit. 

- We NEED to capture recording lengths and do it CORRECTLY!! Undefined lengths break playback progress bar!

Need to add a theme toggle to settings. 3 way. defaults to browser pref.

Library header still gets weird gray bg in light when dropdown open. 

Pause is not working? Keeps rolling the clock. 
Still no way to cancel recording. Getting old. 

On light theme, note detail is still dark (no!). Though text picks up correct fg color.

Agents looks better!

Headers of Agents and Library and Settings are different. All have diff heights.
Add buttons in headers of Library and Agents have diff colored icons. Agents plus is dark, looks worse.
Dialog to add agent is good except primary action button text is dark and looks bad. 

also dialogs need to not underlap the tab bar.

Settings is so so. Provider stuff is still dark when it shouldn't be. Remove that test button.
provider connected info card is off. seems styled for dark. should do both.
 for rows of provider card:
 1: title, type, api key partial, spacer, delete button
 2: model info, spacer, last validated

 Transcription model picker is still dark.
 Data management subsections are still dark.
 debug info still dark.


 still waiting to see sticky section headers in settings and in library.

Still seeing darkness in data management settings.

Clear All Data dialog is still dark. 

Confirms for settings clearing should alos be dialogs. We need to get rid of the JS confirms.

Remove debug info. I'll just comment the About pane when you pause.

Still waiting for sticky headers. 

Library header is still shorter than the others. 
Agents Add button plus is still dark in light theme when it should not be.

Note detail is still dark theme and should follow theming.

Footer tabs still look WEIRD on light theme. the tabs themselves a whitebox but inside a row that is like translucent gray.

Navigation on detail page is still not what I requested.

Breadcrumb is a little choppy. Seems like it jumps levels. Need to show all levels when possible and otherwise have ellipsis logic?

Notes search should be part of fixed top area attached to header

Section labels should be sticky. 

When showing a player or recorder persistently over a tab area, the tab/tab host area should know so that it can adjust with bottom spacing. currently my library cards are stuck behind the player / recorder. 

Player recorder are way too wide. should have a sane max width like lg or even md. 


Success color seems to have been lost? Ie 1 provider(s) connected box has no colors.


