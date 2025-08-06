# The Rules

Don't fucking rewrite shit that is working. 

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