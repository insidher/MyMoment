# Changelog

All notable changes to the MyMoment project will be documented in this file.

## [1.1.0] - 2026-02-18

### Added
- **Interactive Visual Timeline**: Replaced static placeholders with a fully interactive timeline that supports seeking and visualizes moment duration.
- **Curator Card (Modal)**: Overhauled the moment view into a dedicated modal with enhanced interactions, playback control, and external source linking.
- **Feed Timeline**: The "shish kebab" timeline in the feed now supports multiple moments (pills) for a single video group, providing better context.
- **Sharing Module**: Integrated a new social sharing modal with OG Image generation support.

### Changed
- **UI/UX Refinements**: Standardized headers, improved spacing, and polished the "Saved Moments" list.
- **Playback Logic**: "Play" button in the modal now closes the modal and immediately starts playback at the moment's timestamp.
- **Profile Navigation**: User names in moment cards now link directly to their profile page.
- **Hydration Fixes**: Resolved hydration errors in the SearchBar caused by browser extensions.

### Security & Cleanup
- **Log Purge**: Removed verbose debug/trace logs from API routes and actions.
- **Error Handling**: Hardened API error responses to prevent leaking server details to the client.
