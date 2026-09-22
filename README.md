# Can't Love You Anymore

Interactive story in p5.js: a late-night iMessage thread. You have to type every reply yourself. The honest ones are timed. Fail the last line and the conversation loops, a little more broken each time, until you can finally say it.

**Play it:** [teapeafany.github.io/narrative-media-project](https://teapeafany.github.io/narrative-media-project/)

## Run it

Open `index.html` in a browser. 

Then go to `http://127.0.0.1:8000`.

## How it works

**Opening (once).** still + subtitles, then a lock screen. Tap the “Where are you?” notification to open the chat. Loops skip this and drop straight back into the thread.

**Typing.** Every YOU line has to be typed, character by character. Wrong keys don’t get absorbed — Backspace undoes. LOVER lines arrive on their own (typing dots, then the bubble).

**Easy / hard.** At a choice you pick a chip, then type that line.
- Easy is untimed 
- Hard is on a countdown. Run out of time and you bounce back to the chips.
- Their next message (and sometimes the next chips) follow what you actually picked, so the easy path stays coherent.

**Climax.** The last line is always *I don’t think we’re in love anymore*, typed in the same composer under a timer. It gets faster each loop, and a little slower the more hard lines you sent (`hardCount` never resets). A wrong key docks 0.3s. Timer hits 0 → silent restart, no fail screen.

**Loops.** Each fail rebuilds the script:
- Loop 1 — you stutter “Where are you?” at the top; hard lines get sharper. Easy replies still make sense.
- Loop 2 — beats skip and repeat; their last prompts land out of order.
- Loop 3+ — they’re gone. You type “Where are you?” three times into nothing, then the confession with no “Say it.” cue.

**Ending.** Saying the line only *lands* on loop 3+. Before that, finishing it just loops. On success: fade to dark, one last extra unanswered “Where are you?”
