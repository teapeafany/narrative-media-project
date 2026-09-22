// "can't say it" — a small interactive story in p5.js.
//
// first load only: intro narration -> lock-screen notification -> the chat.
// every loop after that drops straight back into the chat, no notification —
// that moment already happened; the loops are trapped inside the scene it opened.

// ============================================================
// THE STORY
// ============================================================

// DIALOGUE SCRIPT
const baseScript = [
    { id: 0,  speaker: "LOVER", text: "Where are you?" },
    { id: 1,  speaker: "YOU",   text: "Where are you?" },

    { id: 2,  speaker: "LOVER", text: "Home soon. Long day." },
    { id: 3,  speaker: "YOU", choice: true,
        easy: "Get here safe.",
        hard: "You don't have to come tonight." },

    { id: 4,  speaker: "LOVER", text: "I want to. I miss you.",
        easyText: "Almost there. Miss you.",               
        hardText: "I want to, though. I miss you." },    
    { id: 5,  speaker: "YOU", choice: true,
        easy: "Miss you too.",                            
        hard: "Do you? Still?" },

    { id: 6,  speaker: "LOVER", text: "Of course I do. Why would you ask that?",
        easyText: "I'm so tired.",
        hardText: "Of course I do. Why would you even ask that?" },
    { id: 7,  speaker: "YOU", choice: true,
        easy: "No reason. I'm just tired.",
        hard: "I've been trying to tell you something for weeks.",
        easyAfterEasy: "Come home. I'll wait up.",
        hardAfterEasy: "There's something I need to tell you.",
        easyAfterHard: "No reason. I'm just tired.",
        hardAfterHard: "I've been trying to tell you something for weeks." },

    { id: 8,  speaker: "LOVER", text: "So tell me. You can tell me anything.",
        easyText: "I'll be quiet coming in.",
        hardText: "So tell me. You can tell me anything." },
    { id: 9,  speaker: "YOU", choice: true,
        easy: "It can wait.",
        hard: "It can't. That's the whole problem.",
        easyAfterEasy: "Okay. See you soon.",
        hardAfterEasy: "Don't. Not tonight.",
        easyAfterHard: "It can wait.",
        hardAfterHard: "It can't. That's the whole problem." },

    { id: 10, speaker: "LOVER", text: "You're scaring me.",
        easyText: "I'm almost there.",
        hardText: "You're scaring me." },
    { id: 11, speaker: "YOU", choice: true,
        easy: "Don't be. It's nothing.",
        hard: "I'm scared too.",
        easyAfterEasy: "Drive safe.",
        hardAfterEasy: "Please don't come up.",
        easyAfterHard: "Don't be. It's nothing.",
        hardAfterHard: "I'm scared too." },

    { id: 12, speaker: "LOVER", text: "I'm almost there. We'll figure it out.",
        easyText: "Five minutes.",
        hardText: "I'm almost there. We'll figure it out." },
    { id: 13, speaker: "YOU", choice: true,
        easy: "Okay. Drive safe.",
        hard: "Please don't come up.",
        easyAfterEasy: "Okay. I'll unlock the door.",
        hardAfterEasy: "Don't come up.",
        easyAfterHard: "Okay. Drive safe.",
        hardAfterHard: "Please don't come up." },

    { id: 14, speaker: "LOVER", text: "I'm at the door." },
    { id: 15, speaker: "LOVER", text: "...are you going to let me in?" },
    { id: 16, speaker: "YOU", choice: true,
        easy: "Yeah. One second.",
        hard: "I can't keep pretending." },

    { id: 17, speaker: "LOVER", text: "Pretending what?",
        easyText: "You don't sound sure.",
        hardText: "Pretending what?" },
    { id: 18, speaker: "LOVER", text: "Say it." },

    { id: 19, speaker: "YOU", climax: true, text: "I don't think we're in love anymore." }
];

// ENDING PHRASE
const climaxPhrase = "I don't think we're in love anymore";

// pacing. characters-per-second for the typing tests
const hardChoiceCPS = 7;         
const dialogueDuration = 1900;   
const incomingTypingDelay = 950; 

// climax difficulty. it speeds up (harder) each loop, and slows a little (kinder)
const climaxBaseCPS = 8;
const climaxLoopStep = 1.2;
const climaxHardStep = 0.15;
const climaxMinCPS = 5;
const climaxMaxCPS = 14;

// ============================================================
// INTRO + LOCK SCREEN CONTENT
// ============================================================
const introNarrative = [
    "It's late. They're on their way over, like always.",
    "You've been meaning to tell them something for weeks now.",
    "Every night you swear tonight's the night. Every night you don't.",
    "Then the notification lights up."
];
//lockscreen ui
const lockTime = "9:09";
const lockDate = "Tuesday, September 22";
const notification = {
    title: "lover",
    time: "now",
    body: "Where are you?"
};

// timestamping old messages
const messageHistory = [
    { isDate: true, label: "Sat, Sep 13 at 9:18 AM" },
    { side: "left", text: "good morning." },
    { side: "right", text: "morning, sorry i was busy at work." },
    { side: "left", text: "how are you" },
    { side: "right", text: "i'm okay. just tired." },
    { side: "left", text: "dinner tonight?" },
    { side: "right", text: "maybe. i'll let you know." },
    { side: "left", text: "im not feeling great." },
    { side: "right", text: "sorry i was busy at work." },
    { isDate: true, label: "Sun, Sep 14 at 10:47 PM" },
    { side: "left", text: "you home?" },
    { side: "right", text: "just got here." }
];

// ============================================================
// STATE (everything that changes while it's running)
// ============================================================

let workingScript = [];     
let sessionMessages = [];   
let loopCount = 0;         
let currentIndex = 0;      
let hardCount = 0;         
let introPage = 0;          
let phase = "intro";        // intro -> lockscreen -> dialogue -> choice -> choiceTyping -> climax -> end
let phaseStartedAt = 0;    

// the reply-typing challenge
let selectedChoice = "";    // "easy" or "hard" once i tap a chip
let lastChoice = "";        // the pick that just landed, so their reply can react to it
let choiceTyped = "";       // what i've typed so far
let hardMistakes = 0;       // wrong keys on the honest line (blurs the ghost text)
let typingFocused = false;
let choiceTypingStartedAt = 0;
let choiceTypingTimeLimit = 0;

// the final line
let climaxTyped = "";
let climaxRemaining = 0;
let climaxTimeLimit = 0;
let climaxLastFrame = 0;

// an incoming line waits as a "..." bubble before it actually shows up
let pendingIncoming = null;
// shakes the composer for a moment right after a mistyped key
let mistakeShakeUntil = 0;

// ============================================================
// LAYOUT + STYLE
// ============================================================

// the lock-screen notification's tap target — sits under the clock.
const notifBox = { x: 90, y: 196, w: 820, h: 84 };

// apple's system font
const uiFont = '-apple-system, "Helvetica Neue", Arial, sans-serif';

const REPLY = {
    panelX: 80, panelW: 840, panelTop: 468, panelBottom: 658,
    chipX1: 100, chipX2: 508, chipW: 392, chipY: 486, chipH: 86,
    inputX: 100, inputW: 764, inputY: 598, inputH: 40, sendX: 884
};

// ============================================================
// SETUP + MAIN LOOP
// ============================================================

function setup() {
    createCanvas(1000, 700);
    drawingContext.canvas.style.removeProperty("width");
    drawingContext.canvas.style.removeProperty("height");
    textFont(uiFont);
    phase = "intro";
    introPage = 0;
    phaseStartedAt = millis();
}

function draw() {
    const now = millis();
    updateBgm();
    background("#ffffff");
    if (phase === "intro") {
        drawIntro();
    } else if (phase === "lockscreen") {
        drawLockscreen();
    } else if (phase === "dialogue") {
        updateIncoming(now);
        drawDialogue();
        if (!pendingIncoming && now - phaseStartedAt > dialogueDuration) advanceScript();
    } else if (phase === "choice") {
        drawChoice();
    } else if (phase === "choiceTyping") {
        drawChoiceTyping();
        if (selectedChoice === "hard" && choiceTimeRemaining() <= 0) retryChoice();
    } else if (phase === "climax") {
        updateClimax(now);
        if (phase === "climax") drawClimax();
    } else {
        drawEnd();
    }
}

// ============================================================
// SCREENS
// ============================================================

// one page of the opening story, fading in. a tap moves to the next.
function drawIntro() {
    const context = drawingContext;
    // the film still, full-bleed, held under every line of narration.
    background("#000000");
    const still = storyPhoto("intro-still");
    if (still) drawCoverImage(still, 0.82);

    // dim 
    noStroke();
    fill(0, 0, 0, 60);
    rect(0, 0, width, height);
    const scrim = context.createLinearGradient(0, height * 0.45, 0, height);
    scrim.addColorStop(0, "rgba(0,0,0,0)");
    scrim.addColorStop(1, "rgba(0,0,0,0.82)");
    context.fillStyle = scrim;
    context.fillRect(0, height * 0.45, width, height * 0.55);

    const elapsed = millis() - phaseStartedAt;
    const fade = constrain(elapsed / 900, 0, 1);
    const page = introNarrative[introPage] || "";

    // subtitles: white, centered, low in the frame, with a soft shadow.
    context.save();
    context.shadowColor = "rgba(0, 0, 0, 0.9)";
    context.shadowBlur = 14;
    fill(240, 240, 242, 255 * fade);
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
    textSize(23);
    drawCenteredDialogue(page, width / 2, height - 116, 760);
    context.restore();

    if (elapsed > 1200) {
        const pulse = 0.5 + 0.5 * sin(millis() / 500);
        const isLast = introPage >= introNarrative.length - 1;
        fill(210, 211, 216, 70 + pulse * 80);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(isLast ? "tap to begin" : "tap to continue", width / 2, height - 42);
    }
    textAlign(LEFT, TOP);
}

// grab a photo from the html page (load image can't be used because of cross-origin restrictions). 
function storyPhoto(id) {
    const el = document.getElementById(id);
    if (el && el.complete && el.naturalWidth > 1) return el;
    return null;
}


function drawCoverImage(img, focusY = 0.5) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const imgRatio = iw / ih;
    const canvasRatio = width / height;
    let dw;
    let dh;
    if (imgRatio > canvasRatio) {
        dh = height;
        dw = height * imgRatio;
        const extra = dw - width;
        drawingContext.drawImage(img, -extra * focusY, 0, dw, dh);
    } else {
        dw = width;
        dh = width / imgRatio;
        const extra = dh - height;
        drawingContext.drawImage(img, 0, -extra * focusY, dw, dh);
    }
}

// the lock screen ui
function drawLockscreen() {
    background("#1a1612");
    const photo = storyPhoto("lock-photo");
    if (photo) drawCoverImage(photo);

    // a little dim at the top so the time stays readable over the photo.
    const context = drawingContext;
    const topFade = context.createLinearGradient(0, 0, 0, 220);
    topFade.addColorStop(0, "rgba(0,0,0,0.45)");
    topFade.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = topFade;
    context.fillRect(0, 0, width, 220);

    fill(244, 245, 248);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(82);
    text(lockTime, width / 2, 78);
    textStyle(NORMAL);
    fill(230, 230, 234);
    textSize(18);
    text(lockDate, width / 2, 128);

    const elapsed = millis() - phaseStartedAt;
    const progress = constrain((elapsed - 500) / 600, 0, 1);
    const ease = 1 - pow(1 - progress, 3);
    const slide = (1 - ease) * -48;
    drawNotification(notifBox.x, notifBox.y + slide, notifBox.w, notifBox.h, ease);

    if (progress > 0.9) {
        const pulse = 0.5 + 0.5 * sin(millis() / 420);
        fill(226, 228, 234, 90 + pulse * 90);
        textAlign(CENTER, CENTER);
        textSize(14);
        text("tap the message to open", width / 2, height - 34);
    }
    textAlign(LEFT, TOP);
    textStyle(NORMAL);
}

// the frosted iMessage banner — app icon, sender, preview, "now".
function drawNotification(x, y, cardWidth, cardHeight, alpha) {
    const context = drawingContext;
    context.save();
    context.shadowColor = `rgba(0, 0, 0, ${0.4 * alpha})`;
    context.shadowBlur = 34;
    context.shadowOffsetY = 10;
    fill(246, 247, 249, 240 * alpha);
    noStroke();
    rect(x, y, cardWidth, cardHeight, 22);
    context.restore();

    // the little green messages
    const iconSize = 42;
    const iconX = x + 18;
    const iconY = y + (cardHeight - iconSize) / 2;
    fill(52, 199, 89, 255 * alpha);
    rect(iconX, iconY, iconSize, iconSize, 11);
    fill(255, 255, 255, 255 * alpha);
    rect(iconX + 9, iconY + 11, iconSize - 18, iconSize - 22, 6);
    triangle(
        iconX + 12, iconY + iconSize - 11,
        iconX + 12, iconY + iconSize - 17,
        iconX + 18, iconY + iconSize - 14
    );

    const textX = iconX + iconSize + 14;
    fill(24, 25, 28, 255 * alpha);
    textAlign(LEFT, TOP);
    textStyle(BOLD);
    textSize(16);
    text(notification.title, textX, y + 22);
    textStyle(NORMAL);
    fill(62, 64, 70, 255 * alpha);
    textSize(15);
    text(notification.body, textX, y + 46);

    fill(140, 142, 148, 255 * alpha);
    textAlign(RIGHT, TOP);
    textSize(12);
    text(notification.time, x + cardWidth - 18, y + 24);
    textAlign(LEFT, TOP);
    textStyle(NORMAL);
}

function drawDialogue() {
    drawLaptopMessages();
}

// the whole iMessage window: frame, header, the message stack, optional composer.
function drawLaptopMessages(includeComposer = true, bottomReserve = 70) {
    const frameX = 80;
    const frameY = 42;
    const frameWidth = 840;
    const frameHeight = 616;
    const headerHeight = 82;

    fill("#f7f7f8");
    stroke("#dddddf");
    strokeWeight(1);
    rect(frameX, frameY, frameWidth, frameHeight, 12);
    noStroke();

    // header: back chevron, their name, the little info button.
    fill("#ffffff");
    rect(frameX, frameY, frameWidth, headerHeight, 12);
    fill("#f0f0f2");
    rect(frameX, frameY + headerHeight - 1, frameWidth, 1);

    fill("#b6b7bb");
    ellipse(frameX + 34, frameY + 41, 30, 30);
    fill("#ffffff");
    textAlign(CENTER, CENTER);
    textSize(16);
    text("‹", frameX + 34, frameY + 39);
    fill("#222226");
    textSize(16);
    textStyle(BOLD);
    text("lover", frameX + frameWidth / 2, frameY + 31);
    textStyle(NORMAL);
    fill("#99999f");
    textSize(11);
    text("iMessage", frameX + frameWidth / 2, frameY + 52);
    fill("#e9e9ec");
    ellipse(frameX + frameWidth - 34, frameY + 41, 30, 30);
    fill("#7b7c82");
    rect(frameX + frameWidth - 42, frameY + 35, 16, 11, 4);

    // build the stack: yesterday's history, then anything from this playthrough,
    // plus a "..." bubble if they're mid-typing.
    const previousConversation = messageHistory.map((message) => (
        message.isDate ? message : {
            ...message,
            lines: wrapMessage(message.text, 14, 430)
        }
    ));
    const showToday = sessionMessages.length > 0 || pendingIncoming || phase === "choice" || phase === "choiceTyping" || phase === "climax";
    const currentConversation = showToday ? [
        { isDate: true, label: "Today 9:09 PM" },
        ...sessionMessages.map((message) => ({
            ...message,
            lines: wrapMessage(message.text, 14, 430)
        }))
    ] : [];
    if (pendingIncoming) {
        currentConversation.push({ typing: true, side: "left", lines: [" "] });
    }
    const allMessages = [...previousConversation, ...currentConversation];

    // keep the newest messages in view by dropping the oldest until it fits.
    const messageAreaHeight = frameHeight - headerHeight - bottomReserve;
    let visibleMessages = allMessages;
    while (visibleMessages.length > 1 && messageStackHeight(visibleMessages) > messageAreaHeight) {
        visibleMessages = visibleMessages.slice(1);
    }

    // bottom-align the stack so new texts sit right above the composer.
    let messageY = frameY + headerHeight + messageAreaHeight - messageStackHeight(visibleMessages);
    for (const message of visibleMessages) {
        if (message.isDate) {
            fill("#8d8d92");
            textAlign(CENTER, CENTER);
            textSize(12);
            text(message.label, frameX + frameWidth / 2, messageY + 16);
            messageY += 44;
            continue;
        }
        if (message.typing) {
            drawTypingIndicator(messageY, frameX);
            messageY += 43;
            continue;
        }
        drawMessageBubble(message, messageY, frameX, frameWidth);
        // a "Delivered" receipt under my most recent sent text.
        const isLast = message === visibleMessages[visibleMessages.length - 1];
        if (isLast && message.side === "right" && message.at && millis() - message.at > 340) {
            fill("#9b9ba0");
            textAlign(RIGHT, TOP);
            textSize(11);
            text("Delivered", frameX + frameWidth - 24, messageY + message.lines.length * 20 + 14);
        }
        messageY += message.lines.length * 20 + 23;
    }

    // the plain, non-interactive composer shown while i'm just reading.
    if (includeComposer) {
        fill("#ffffff");
        rect(frameX, frameY + frameHeight - 54, frameWidth, 54);
        fill("#f1f1f3");
        stroke("#d7d7da");
        rect(frameX + 18, frameY + frameHeight - 42, frameWidth - 72, 30, 15);
        noStroke();
        fill("#9b9ba0");
        textAlign(LEFT, CENTER);
        textSize(13);
        text("iMessage", frameX + 33, frameY + frameHeight - 27);
        drawSendArrow(frameX + frameWidth - 29, frameY + frameHeight - 27, false);
    }
    textAlign(LEFT, TOP);
}

// break a message into lines that fit inside a bubble.
function wrapMessage(message, fontSize, maxWidth) {
    textSize(fontSize);
    const words = message.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && textWidth(candidate) > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);
    return lines;
}

// how tall the visible stack is, so i can bottom-align it.
function messageStackHeight(messages) {
    return messages.reduce((height, message) => {
        return height + (message.isDate ? 44 : message.lines.length * 20 + 23);
    }, 0);
}

// one bubble. fresh ones (the ones with an "at" time) slide up and fade in so
// sending feels soft instead of snapping into place.
function drawMessageBubble(message, y, frameX, frameWidth) {
    textSize(14);
    const longestLine = max(...message.lines.map((line) => textWidth(line)));
    const bubbleWidth = min(470, max(130, longestLine + 34));
    const bubbleHeight = message.lines.length * 20 + 12;
    const bubbleX = message.side === "left" ? frameX + 22 : frameX + frameWidth - bubbleWidth - 22;

    const age = message.at ? millis() - message.at : Infinity;
    const appear = constrain(age / 300, 0, 1);
    const ease = 1 - pow(1 - appear, 3);
    const drawY = y + (1 - ease) * 14;
    const previousAlpha = drawingContext.globalAlpha;
    drawingContext.globalAlpha = ease;

    fill(message.side === "left" ? "#e5e5e7" : "#1597f6");
    rect(bubbleX, drawY, bubbleWidth, bubbleHeight, 17);
    fill(message.side === "left" ? "#202024" : "#ffffff");
    textAlign(LEFT, TOP);
    message.lines.forEach((line, index) => text(line, bubbleX + 17, drawY + 7 + index * 20));

    drawingContext.globalAlpha = previousAlpha;
}

// the little three-dot "they're typing" bubble.
function drawTypingIndicator(y, frameX) {
    const bubbleWidth = 66;
    const bubbleHeight = 32;
    const bubbleX = frameX + 22;
    fill("#e5e5e7");
    rect(bubbleX, y, bubbleWidth, bubbleHeight, 16);
    for (let index = 0; index < 3; index += 1) {
        const bounce = sin(millis() / 200 - index * 0.6);
        const dotY = y + bubbleHeight / 2 - 2 + bounce * 2;
        fill(150, 152, 158, 150 + (bounce + 1) * 52);
        ellipse(bubbleX + 20 + index * 13, dotY, 7, 7);
    }
}

// the round send button.
function drawSendArrow(x, y, enabled) {
    fill(enabled ? "#1597f6" : "#c7c7cb");
    ellipse(x, y, 24, 24);
    stroke("#ffffff");
    strokeWeight(2);
    line(x - 6, y + 2, x, y - 4);
    line(x, y - 4, x + 6, y + 2);
    noStroke();
}

function drawCenteredDialogue(message, centerX, centerY, maxWidth) {
    const words = message.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (textWidth(candidate) > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);
    const lineHeight = 38;
    const firstLineY = centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((lineText, index) => {
        text(lineText, centerX, firstLineY + index * lineHeight);
    });
}

// my turn: show the chat with the reply bar underneath.
function drawChoice() {
    drawLaptopMessages(false, 190);
    drawReplyPanel();
}

// the bottom bar — two reply chips over a single input, all one clean panel.
// a plain line has no branches, so the panel collapses to just the compose bar.
function drawReplyPanel() {
    const lineMode = selectedChoice === "line";
    const top = lineMode ? REPLY.inputY - 26 : REPLY.panelTop;

    noStroke();
    fill("#f5f5f7");
    rect(REPLY.panelX, top, REPLY.panelW, REPLY.panelBottom - top, 0, 0, 12, 12);
    fill("#e6e6ea");
    rect(REPLY.panelX, top, REPLY.panelW, 1);

    if (!lineMode) {
        drawReplyChip(REPLY.chipX1, REPLY.chipY, REPLY.chipW, REPLY.chipH, choiceChipText("easy"), "easy");
        drawReplyChip(REPLY.chipX2, REPLY.chipY, REPLY.chipW, REPLY.chipH, choiceChipText("hard"), "hard");
    }
    drawReplyComposer();
}

// one reply option. the one i tap turns blue, the other dims. no gamey labels.
function drawReplyChip(x, y, w, h, message, tone) {
    const selected = selectedChoice === tone;
    const dimmed = selectedChoice !== "" && !selected;
    if (selected) {
        fill("#1597f6");
        stroke("#1597f6");
    } else {
        fill(dimmed ? "#efeff2" : "#ffffff");
        stroke(dimmed ? "#e6e6ea" : "#dcdce1");
    }
    strokeWeight(1);
    rect(x, y, w, h, 18);
    noStroke();
    fill(selected ? "#ffffff" : (dimmed ? "#b6b6bc" : "#1c1c1e"));
    drawMultilineCentered(message, x + 20, y + h / 2, w - 40, 15);
    textAlign(LEFT, TOP);
}

// wrap and vertically center text inside a chip.
function drawMultilineCentered(message, x, cy, maxWidth, fontSize) {
    const lines = wrapMessage(message, fontSize, maxWidth);
    const lineHeight = fontSize + 5;
    const firstY = cy - ((lines.length - 1) * lineHeight) / 2;
    textAlign(LEFT, CENTER);
    textSize(fontSize);
    lines.forEach((lineText, index) => text(lineText, x, firstY + index * lineHeight));
}

// the input field. empty before i pick; once i do, it becomes the typing test
// (and for the honest line, it grows a timer, a countdown bar, and a red edge).
function drawReplyComposer() {
    const y = REPLY.inputY;
    const h = REPLY.inputH;
    const centerY = y + h / 2;
    const isTyping = phase === "choiceTyping";
    const isHard = selectedChoice === "hard";
    const target = isTyping ? selectedChoiceText() : "";
    const canSend = isTyping && matchesHardLine(choiceTyped, target);
    const fraction = isTyping && isHard && choiceTypingTimeLimit > 0
        ? constrain(choiceTimeRemaining() / choiceTypingTimeLimit, 0, 1)
        : 1;
    const urgent = isTyping && isHard && fraction < 0.25;

    fill("#ffffff");
    if (urgent) {
        const pulse = 0.5 + 0.5 * sin(millis() / 110);
        const border = color(255, 59, 48);
        border.setAlpha(170 + pulse * 85);
        stroke(border);
    } else {
        stroke(isTyping && typingFocused ? "#1597f6" : "#d9d9de");
    }
    strokeWeight(1.5);
    rect(REPLY.inputX, y, REPLY.inputW, h, h / 2);
    noStroke();

    if (isTyping) {
        const typedProgress = typingProgress(target, choiceTyped);
        drawComposerText(target, typedProgress, REPLY.inputX + 20, centerY,
            isHard ? constrain((hardMistakes - 2) * 1.5, 0, 7) : 0);
        if (isHard) {
            fill(urgent ? color(255, 59, 48) : color(120, 122, 128));
            textAlign(RIGHT, CENTER);
            textSize(12);
            text(`${choiceTimeRemaining().toFixed(1)}s`, REPLY.inputX + REPLY.inputW - 16, centerY);
            textAlign(LEFT, CENTER);
            drawPressureBar(REPLY.inputX + 2, y - 8, REPLY.inputW - 4, fraction);
        }
    } else {
        fill("#9b9ba0");
        textAlign(LEFT, CENTER);
        textSize(15);
        text("iMessage", REPLY.inputX + 20, centerY);
    }

    // the send button glows once the line actually matches.
    if (canSend) {
        const pulse = 0.5 + 0.5 * sin(millis() / 220);
        drawingContext.save();
        drawingContext.shadowColor = `rgba(21, 151, 246, ${0.45 + 0.4 * pulse})`;
        drawingContext.shadowBlur = 14 + 8 * pulse;
        drawSendArrow(REPLY.sendX, centerY, true);
        drawingContext.restore();
    } else {
        drawSendArrow(REPLY.sendX, centerY, false);
    }
    textAlign(LEFT, TOP);
}

// same chat + reply bar as the choice, just wrapped in the pressure shake.
function drawChoiceTyping() {
    push();
    applyPressureShake();
    // line mode collapses to the slim bar, so reserve less and let the thread
    // drop right down to it — no dead space where the chips would've been.
    const reserve = selectedChoice === "line" ? 86 : 190;
    drawLaptopMessages(false, reserve);
    drawReplyPanel();
    pop();
}

// nudge the screen on a typo, and let it tremble as a timer runs out.
function applyPressureShake() {
    let magnitude = 0;
    if (millis() < mistakeShakeUntil) magnitude = 4;
    if (phase === "choiceTyping" && selectedChoice === "hard" && choiceTypingTimeLimit > 0) {
        const fraction = constrain(choiceTimeRemaining() / choiceTypingTimeLimit, 0, 1);
        if (fraction < 0.35) magnitude = max(magnitude, (0.35 - fraction) / 0.35 * 2.4);
    }
    if (phase === "climax" && climaxTimeLimit > 0) {
        const fraction = constrain(climaxRemaining / climaxTimeLimit, 0, 1);
        if (fraction < 0.35) magnitude = max(magnitude, (0.35 - fraction) / 0.35 * 2.4);
    }
    if (magnitude > 0) translate(random(-magnitude, magnitude), random(-magnitude, magnitude));
}

// the countdown bar: green -> amber -> red-and-pulsing as the time drains.
function drawPressureBar(x, y, barWidth, fraction) {
    fill(228, 229, 233);
    rect(x, y, barWidth, 4, 2);
    let barColor;
    if (fraction > 0.5) {
        barColor = color(52, 199, 89);
    } else if (fraction > 0.25) {
        barColor = color(255, 169, 64);
    } else {
        const pulse = 0.55 + 0.45 * sin(millis() / 110);
        barColor = color(255, 59, 48);
        barColor.setAlpha(150 + pulse * 105);
    }
    fill(barColor);
    rect(x, y, barWidth * fraction, 4, 2);
}

// the draft line in the composer.
function drawComposerText(target, typedLength, x, y, blurAmount) {
    textAlign(LEFT, CENTER);
    textSize(15);
    const typed = target.slice(0, typedLength);

    if (blurAmount > 0) {
        drawingContext.save();
        drawingContext.filter = `blur(${blurAmount}px)`;
        fill("#9fa1a5");
        text(target, x, y);
        drawingContext.restore();
    } else {
        fill("#bdbdbd");
        text(target, x, y);
    }

    fill("#111111");
    text(typed, x, y);

    const caretX = x + measurePrefix(typed);
    if (typedLength < target.length) {
        fill("#d6aa00");
        text(target[typedLength], caretX, y);
    }
    fill("#d6aa00");
    rect(caretX, y - 12, 2, 24);
}

function measurePrefix(str) {
    if (str.length === 0) return 0;
    return textWidth(`${str}.`) - textWidth(".");
}

// the final line 
function drawClimax() {
    push();
    applyPressureShake();
    drawLaptopMessages(false, 86); 
    drawClimaxComposer();
    pop();
}

function drawClimaxComposer() {
    const y = REPLY.inputY;
    const h = REPLY.inputH;
    const centerY = y + h / 2;
    const top = y - 26;
    const fraction = climaxTimeLimit > 0 ? constrain(climaxRemaining / climaxTimeLimit, 0, 1) : 1;
    const urgent = fraction < 0.25;
    const canSend = matchesHardLine(climaxTyped, climaxPhrase);
    const typedProgress = typingProgress(climaxPhrase, climaxTyped);

    // slim panel, same as a plain line.
    noStroke();
    fill("#f5f5f7");
    rect(REPLY.panelX, top, REPLY.panelW, REPLY.panelBottom - top, 0, 0, 12, 12);
    fill("#e6e6ea");
    rect(REPLY.panelX, top, REPLY.panelW, 1);

    // input field — red-edged and pulsing once time gets short.
    fill("#ffffff");
    if (urgent) {
        const pulse = 0.5 + 0.5 * sin(millis() / 110);
        const border = color(255, 59, 48);
        border.setAlpha(170 + pulse * 85);
        stroke(border);
    } else {
        stroke("#1597f6");
    }
    strokeWeight(1.5);
    rect(REPLY.inputX, y, REPLY.inputW, h, h / 2);
    noStroke();

    drawComposerText(climaxPhrase, typedProgress, REPLY.inputX + 20, centerY, 0);

    fill(urgent ? color(255, 59, 48) : color(120, 122, 128));
    textAlign(RIGHT, CENTER);
    textSize(12);
    text(`${max(0, climaxRemaining).toFixed(1)}s`, REPLY.inputX + REPLY.inputW - 16, centerY);
    textAlign(LEFT, CENTER);
    drawPressureBar(REPLY.inputX + 2, y - 8, REPLY.inputW - 4, fraction);

    // the line sends itself the instant it matches (see keyTyped), so this just
    // glows for that last frame.
    if (canSend) {
        const pulse = 0.5 + 0.5 * sin(millis() / 220);
        drawingContext.save();
        drawingContext.shadowColor = `rgba(21, 151, 246, ${0.45 + 0.4 * pulse})`;
        drawingContext.shadowBlur = 14 + 8 * pulse;
        drawSendArrow(REPLY.sendX, centerY, true);
        drawingContext.restore();
    } else {
        drawSendArrow(REPLY.sendX, centerY, false);
    }
    textAlign(LEFT, TOP);
}

// fade to dark, then one last "Where are you?" sitting there with no reply.
function drawEnd() {
    background("#08090d");
    const elapsed = millis() - phaseStartedAt;
    const fade = constrain((elapsed - 600) / 2200, 0, 1);
    fill(150, 152, 160, 210 * fade);
    textAlign(CENTER, CENTER);
    textStyle(NORMAL);
    textSize(22);
    text("Where are you?", width / 2, height / 2);
    textAlign(LEFT, TOP);
}

// ============================================================
// FLOW / STATE MACHINE
// ============================================================

// tap through the intro pages, then unlock into the lock screen.
function advanceIntro() {
    if (millis() - phaseStartedAt < 350) return;
    if (introPage < introNarrative.length - 1) {
        introPage += 1;
        phaseStartedAt = millis();
    } else {
        beginLockscreen();
    }
}

// show the lock screen and kick off the notification animation.
function beginLockscreen() {
    phase = "lockscreen";
    phaseStartedAt = millis();
    startBgm();
}

function startChat() {
    startBgm();
    loopCount = 0;
    hardCount = 0;
    startLoop();
}

function startBgm() {
    const el = document.getElementById("bgm");
    if (!el) return;
    el.loop = true;
    if (el.volume === 1) el.volume = 0.2;
    const play = el.play();
    if (play && play.catch) play.catch(() => {});
}

function updateBgm() {
    const el = document.getElementById("bgm");
    if (!el) return;
    let target = 0.2;
    if (phase === "climax") target = 0.1;
    if (phase === "end") {
        const fade = constrain((millis() - phaseStartedAt) / 2800, 0, 1);
        target = 0.2 * (1 - fade);
        if (fade >= 1 && !el.paused) el.pause();
    }
    el.volume += (target - el.volume) * 0.08;
}

// (re)start the conversation for the current loopCount. no narration or
// notification on restarts — the loops live entirely inside the chat.
function startLoop() {
    workingScript = applyLoopDrift(baseScript, loopCount);
    currentIndex = 0;
    sessionMessages = [];
    selectedChoice = "";
    lastChoice = "";
    choiceTyped = "";
    pendingIncoming = null;
    playEntry(workingScript[0]);
}

// a failed climax: bump the loop and quietly cut back to the start, drifted.
function failClimaxLoop() {
    loopCount += 1;
    startLoop();
}

// take one script entry and route it to the right phase.
function playEntry(entry) {
    if (entry.climax) return beginClimax();
    if (entry.choice) return beginChoice();
    if (entry.speaker === "LOVER") return playIncomingLine(entry);
    return playOutgoingLine();
}

function collapseIncoming(entry, forcedText) {
    delete entry.easyText;
    delete entry.hardText;
    entry.text = forcedText;
}

// lock a choice beat to one pair of chips, ignoring the previous-path variants.
function flattenChoice(entry, easy, hard) {
    entry.easy = easy;
    entry.hard = hard;
    delete entry.easyAfterEasy;
    delete entry.hardAfterEasy;
    delete entry.easyAfterHard;
    delete entry.hardAfterHard;
}

// when drift rewrites a hard line, keep the path-specific copies in sync.
function setHard(entry, text) {
    entry.hard = text;
    if (entry.hardAfterEasy !== undefined) entry.hardAfterEasy = text;
    if (entry.hardAfterHard !== undefined) entry.hardAfterHard = text;
}

function applyLoopDrift(script, loop) {
    const drifted = structuredClone(script);
    const byId = (id) => drifted.find((line) => line.id === id);

    if (loop === 1) {
        drifted.unshift({ id: -1, speaker: "YOU", text: "Where are you?" });
        setHard(byId(5), "Do you? I can't feel it anymore.");
        setHard(byId(13), "Don't come up. There's nothing to come home to.");
        byId(6).hardText = "You're scaring me.";
        byId(7).easyAfterHard = "Don't be. It's nothing.";
        byId(10).hardText = null; // they go quiet if i pushed, not if i dodged
        return drifted;
    }

    if (loop === 2) {
        // their prompts start landing out of order, a line repeats back-to-back,
        // and a whole beat drops out. i'm bracing for the ending before it comes.
        const askA = byId(17);
        const askB = byId(18);
        collapseIncoming(askA, "Pretending what?"); // flatten before swapping the order
        [askA.text, askB.text] = [askB.text, askA.text]; // "Say it." then "Pretending what?"
        setHard(byId(9), "It can't wait. I already know how it ends.");
        setHard(byId(11), "I'm scared because I already know.");
        byId(15).text = "I'm at the door."; // repeats back-to-back with id 14
        // sequence skip: drop the "Of course I do..." / "No reason..." beat.
        return drifted.filter((line) => line.id !== 6 && line.id !== 7);
    }

    if (loop >= 3) {
        // collapse: LOVER is gone. just me asking "Where are you?" three times
        // into nothing, and the confession i finally have to type with no cue.
        return [
            { id: -2, speaker: "YOU", text: "Where are you?" },
            { id: -3, speaker: "YOU", text: "Where are you?" },
            { id: -4, speaker: "YOU", text: "Where are you?" },
            byId(19)
        ];
    }

    return drifted; // loop 0: as written.
}

// their reply reacts to what i just picked: dodging (easy) keeps them warm,
// cracking (hard) rattles them. lines with no variant just use their default.
function incomingText(entry) {
    let value = entry.text;
    if (lastChoice === "easy" && entry.easyText !== undefined) value = entry.easyText;
    if (lastChoice === "hard" && entry.hardText !== undefined) value = entry.hardText;
    return value;
}

// their turn: queue the line as a "..." bubble that reveals itself in a beat.
// a null line (drift left it empty) shows up as "(no reply)".
function playIncomingLine(entry) {
    phase = "dialogue";
    const line = incomingText(entry);
    pendingIncoming = {
        text: line === null ? "(no reply)" : line,
        revealAt: millis() + incomingTypingDelay
    };
    phaseStartedAt = millis();
}

// even my plain lines don't send themselves — i have to type them out. no chips,
// no timer, just me physically saying the words before they go. reuses the same
// composer as the choices, flagged as a "line" so it skips the easy/hard chips.
function playOutgoingLine() {
    pendingIncoming = null;
    selectedChoice = "line";
    choiceTyped = "";
    hardMistakes = 0;
    typingFocused = true;
    phase = "choiceTyping";
}

// is this tap on the notification card?
function pointInNotification(px, py) {
    return px >= notifBox.x && px <= notifBox.x + notifBox.w
        && py >= notifBox.y && py <= notifBox.y + notifBox.h;
}

// plain point-in-rectangle check.
function withinBox(px, py, x, y, boxWidth, boxHeight) {
    return px >= x && px <= x + boxWidth && py >= y && py <= y + boxHeight;
}

// once the typing beat is up, actually drop their message into the thread.
function updateIncoming(now) {
    if (!pendingIncoming) return;
    if (now >= pendingIncoming.revealAt) {
        sessionMessages.push({ side: "left", text: pendingIncoming.text, at: now });
        pendingIncoming = null;
        phaseStartedAt = now;
    }
}

// step to the next line and hand it to playEntry.
function advanceScript() {
    currentIndex += 1;
    if (currentIndex >= workingScript.length) return beginEnd();
    playEntry(workingScript[currentIndex]);
}

// hand it to me: reset the reply state and wait for a pick.
function beginChoice() {
    selectedChoice = "";
    choiceTyped = "";
    hardMistakes = 0;
    typingFocused = false;
    phase = "choice";
}

// i tapped a chip. the easy dodge is untimed; the honest line starts a countdown.
function resolveChoice(tone) {
    selectedChoice = tone;
    choiceTyped = "";
    hardMistakes = 0;
    typingFocused = true;
    choiceTypingStartedAt = millis();
    choiceTypingTimeLimit = selectedChoice === "hard" ? max(4, selectedChoiceText().length / hardChoiceCPS) : 0;
    phase = "choiceTyping";
}

// whichever line i'm currently on the hook to type — a plain line, or the
// easy/hard branch i picked (which itself depends on what i said last).
function selectedChoiceText() {
    const entry = workingScript[currentIndex];
    if (selectedChoice === "line") return entry.text;
    return choiceChipText(selectedChoice);
}

// the chip text for this beat. if i dodged last time, show the easy-path
// follow-ups; if i cracked, show the ones that answer their rattled reply.
function choiceChipText(tone) {
    const entry = workingScript[currentIndex];
    if (lastChoice === "easy") {
        if (tone === "easy" && entry.easyAfterEasy) return entry.easyAfterEasy;
        if (tone === "hard" && entry.hardAfterEasy) return entry.hardAfterEasy;
    }
    if (lastChoice === "hard") {
        if (tone === "easy" && entry.easyAfterHard) return entry.easyAfterHard;
        if (tone === "hard" && entry.hardAfterHard) return entry.hardAfterHard;
    }
    return tone === "easy" ? entry.easy : entry.hard;
}

// loosen matching: lowercase + tidy the spaces so caps or extra spaces don't fail me.
function normalizeInput(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
}

// did i type the whole line (ignoring case)?
function matchesHardLine(input, target) {
    return normalizeInput(input) === normalizeInput(target);
}

// the exact next character the target wants, or null if i'm already done.
// case-insensitive, but whitespace has to line up — no swallowing stray spaces.
function nextExpectedChar(typed, target) {
    if (typed.length >= target.length) return null;
    return target.charAt(typed.length);
}

// how many characters of the target i've matched so far.
function typingProgress(target, input) {
    const normalizedInput = normalizeInput(input);
    for (let index = 0; index <= target.length; index += 1) {
        if (normalizeInput(target.slice(0, index)) === normalizedInput) return index;
    }
    return 0;
}

// seconds left on the honest-line timer.
function choiceTimeRemaining() {
    return max(0, choiceTypingTimeLimit - (millis() - choiceTypingStartedAt) / 1000);
}

// ran out of time — bounce back to the choice and let me try again.
function retryChoice() {
    phase = "choice";
    selectedChoice = "";
    choiceTyped = "";
    hardMistakes = 0;
    typingFocused = false;
}

// send my reply as a bubble. picking the honest line makes the climax a hair easier.
function playSelectedChoice() {
    sessionMessages.push({ side: "right", text: selectedChoiceText(), at: millis() });
    if (selectedChoice === "hard") hardCount += 1;
    lastChoice = selectedChoice; // so their next line answers what i actually said
    phase = "dialogue";
    phaseStartedAt = millis();
}

// only send once the typed line actually matches.
function sendChoiceMessage() {
    if (phase !== "choiceTyping" || !matchesHardLine(choiceTyped, selectedChoiceText())) return false;
    playSelectedChoice();
    return true;
}

// the final line. faster to type each loop, a little kinder the more honest i was.
function beginClimax() {
    phase = "climax";
    climaxTyped = "";
    const cps = constrain(
        climaxBaseCPS + loopCount * climaxLoopStep - hardCount * climaxHardStep,
        climaxMinCPS,
        climaxMaxCPS
    );
    climaxRemaining = climaxPhrase.length / cps;
    climaxTimeLimit = climaxRemaining;
    climaxLastFrame = millis();
}

function sendClimaxMessage() {
    if (loopCount >= 3) {
        sessionMessages.push({ side: "right", text: climaxPhrase, at: millis() });
        beginEnd();
    } else {
        failClimaxLoop();
    }
}

// bleed the climax timer down; running out is a fail, so it loops back drifted.
function updateClimax(now) {
    climaxRemaining -= (now - climaxLastFrame) / 1000;
    climaxLastFrame = now;
    if (climaxRemaining <= 0) failClimaxLoop();
}

// the end: fade to dark and let one last "Where are you?" hang there, unanswered.
function beginEnd() {
    phase = "end";
    phaseStartedAt = millis();
}

// ============================================================
// INPUT
// ============================================================

// clicks: advance the intro, open from the lock screen, pick a chip, or hit send.
function mousePressed() {
    if (phase === "intro") {
        advanceIntro();
        return;
    }
    if (phase === "lockscreen") {
        if (pointInNotification(mouseX, mouseY)) startChat();
        return;
    }
    if (phase === "choice") {
        if (withinBox(mouseX, mouseY, REPLY.chipX1, REPLY.chipY, REPLY.chipW, REPLY.chipH)) {
            resolveChoice("easy");
        } else if (withinBox(mouseX, mouseY, REPLY.chipX2, REPLY.chipY, REPLY.chipW, REPLY.chipH)) {
            resolveChoice("hard");
        }
    } else if (phase === "choiceTyping") {
        if (withinBox(mouseX, mouseY, REPLY.inputX, REPLY.inputY, REPLY.inputW, REPLY.inputH)) {
            typingFocused = true;
        } else if (withinBox(mouseX, mouseY, REPLY.sendX - 20, REPLY.inputY, 40, REPLY.inputH)
            && sendChoiceMessage()) {
            return;
        }
    }
}

// enter sends a finished reply; on the intro/lock screen any key moves forward.
function keyPressed() {
    if (phase === "intro") {
        advanceIntro();
        return false;
    }
    if (phase === "lockscreen") {
        startChat();
        return false;
    }
    if (phase === "choiceTyping" && (keyCode === ENTER || key === "Enter")) {
        sendChoiceMessage();
        return false;
    }
    // backspace walks me back a character so i can undo instead of getting stuck.
    if (keyCode === BACKSPACE) {
        if (phase === "choiceTyping") {
            choiceTyped = choiceTyped.slice(0, -1);
            return false;
        }
        if (phase === "climax") {
            climaxTyped = climaxTyped.slice(0, -1);
            return false;
        }
    }
    return true;
}

// the actual typing: only take correct characters in order, punish the wrong ones
// (blur on the reply, lost time on the climax) and nudge the screen either way.
function keyTyped() {
    if (phase === "choiceTyping") {
        if (typeof key !== "string" || key.length !== 1) return false;
        const expected = nextExpectedChar(choiceTyped, selectedChoiceText());
        if (expected !== null && key.toLowerCase() === expected.toLowerCase()) {
            choiceTyped += expected; // store the target's own character so caps/spaces stay clean
        } else if (selectedChoice === "hard") {
            hardMistakes += 1;
            mistakeShakeUntil = millis() + 220;
        }
        return false;
    }
    if (phase !== "climax") return false;
    if (typeof key !== "string" || key.length !== 1) return false;
    const expected = nextExpectedChar(climaxTyped, climaxPhrase);
    if (expected !== null && key.toLowerCase() === expected.toLowerCase()) {
        climaxTyped += expected;
        if (matchesHardLine(climaxTyped, climaxPhrase)) sendClimaxMessage();
    } else {
        climaxRemaining -= 0.3;
        mistakeShakeUntil = millis() + 220;
    }
    return false;
}
