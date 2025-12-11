# Implementation Plan - Refine Room Layout

The goal is to improve the visual hierarchy and spacing in the Listening Room (`app/room/[id]/page.tsx`), specifically addressing the "crowded" feeling between the Saved Moments list and the Moment Details panel.

## User Review Required
> [!NOTE]
> I will be wrapping the "Saved Moments" section in a `glass-panel` container. This will add a background and padding, creating a distinct visual block separate from the player and the right-hand controls.

## Proposed Changes

### `app/room/[id]/page.tsx`

1.  **Center Column Spacing**:
    *   Keep `space-y-8` for the main column.
    *   Ensure the Player and Metadata block are distinct.

2.  **Saved Moments Section**:
    *   Wrap the entire "Saved Moments" block (Header + List) in a `glass-panel p-6 rounded-xl`.
    *   This creates a "card" effect for the list, matching the aesthetic of the right-hand controls and preventing visual bleeding.
    *   Add `mt-4` or similar if needed for extra breathing room from the metadata.

3.  **Right Column**:
    *   Ensure `sticky top-6` behavior if requested? The user didn't explicitly ask for sticky, but "lines up visually... not overlapping" might imply scrolling behavior. *Correction*: The user said "lines up visually with the top of the player... not overlapping the Saved Moments section". Standard grid handles the "not overlapping" structurally, but visual separation handles the "perceived overlap".
    *   I will stick to standard grid flow but ensure the `glass-panel` usage is consistent.

## Verification Plan

### Manual Verification
- **Visual Check**:
    - Open a Room with saved moments.
    - Verify that the "Saved Moments" list is inside a glass panel.
    - Verify that there is clear vertical spacing between the Player/Title and the Saved Moments panel.
    - Verify that the Right Column (Controls) is visually distinct and separated by the grid gap.
