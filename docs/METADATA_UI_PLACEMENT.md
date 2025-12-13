# Metadata UI Placement Options

You asked: *"Where does the metadata show up?"*

Here are the standard UI patterns for displaying this extra YouTube data without cluttering your clean design.

## 1. On The Timeline (The "Smart Bar")
**Best for**: Chapters, Key Moments
*   **Visual**: Small vertical ticks or colored segments on the timeline bar itself.
*   **Interaction**: Hovering over a specific section shows a small tooltip: `1:15 • Verse 1`.
*   **Why**: Immediate context while seeking.

## 2. "About This Track" Panel (Collapsible)
**Best for**: Full Description, Lyrics, Credits
*   **Visual**: A small `Info (i)` icon next to the Track Title.
*   **Interaction**: Clicking it slides out a "Glass Panel" or expands a section below the player.
*   **Content**:
    *   **Full Description**: The text block from YouTube.
    *   **Tags/Genre**: "Pills" (e.g., `#Jazz`, `#Live`).
    *   **Stats**: "1.2M Views".

## 3. The "Chapter List" (Navigation)
**Best for**: Jumping between sections quickly
*   **Visual**: A vertical list inside the "Moment Details" or "Room" sidebar.
*   **Format**:
    *   `0:00 Intro`
    *   `1:15 Verse 1`
    *   `2:30 Chorus`
*   **Interaction**: Clicking a line acts like a bookmark, jumping the player instantly.

## 4. Automatic "Note" Suggestions (Opt-In)
**Best for**: Speeding up moment labeling.

*   **Logic**:
    *   **Empty State**: If no chapter data exists for the current timestamp, the suggestion section **does not appear**.
    *   **Checkbox UI**: A small checkbox appears below the Note input:
        > `[ ] Include: "Verse 1"`
    *   **Interaction**:
        *   **Unchecked (Default)**: User types their own note.
        *   **Checked**: The text (e.g., "Verse 1") is appended or pre-filled into the note field.
        *   **Hybrid**: User can check the box AND type additional text (e.g., "Verse 1 - The best part").

## 5. Moment Card Visuals (Readability)
**Rule**: Keep the card clean and scannable.

*   **Truncation Logic**:
    *   **Limit**: Max **40 characters** visible initially.
    *   **Overflow**: If text exceeds 40 chars, hide the rest.
*   **Expand/Collapse**:
    *   **UI**: A small chevron/caret (`⌄` or `^`) button appears next to the text if truncated.
    *   **Interaction**: Clicking toggle reveals the full note in place.

## Recommendation for "Moments" App
Start with **#1 (Timeline Ticks)** and **#4 (Opt-In Suggestions)**.
-   **Timeline Ticks** provide precision.
-   **Opt-In Checkbox** respects user agency while offering help.
-   **Truncated Cards** ensure the feed remains consistent and scannable.
