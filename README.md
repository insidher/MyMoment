# Moments

A web app to save your favorite parts of songs from Spotify and YouTube.

## Features

- **Paste & Play**: Support for Spotify tracks and YouTube videos.
- **Mark Moments**: Set start and end timestamps for your favorite parts.
- **Save Notes**: Add personal notes to remember why it's special.
- **Local Storage**: Moments are saved locally to `data/moments.json`.

## Getting Started

### Prerequisites

- Node.js 18+ installed.

### Installation

1.  Clone the repository (or navigate to the folder).
2.  Install dependencies:

    ```bash
    npm install
    ```

### Running the App

1.  Start the development server:

    ```bash
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Usage

1.  **Home**: Paste a Spotify or YouTube link.
2.  **Room**: The player will load. Enter a Start Time and End Time (e.g., "0:45", "1:20").
3.  **Save**: Add a note and click "Save Moment".
4.  **Verify**: Check `data/moments.json` to see your saved moment.
