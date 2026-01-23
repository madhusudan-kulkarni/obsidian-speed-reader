# Speed Reader

RSVP-based speed reading for Obsidian. Flash one word at a time with optimal recognition point (ORP) highlighting to read faster with better focus.

## Features

- **RSVP Display**: Shows one word at a time, reducing eye movement and increasing reading speed
- **ORP Highlighting**: Highlights the optimal recognition point of each word for faster processing
- **Smart Timing**: Automatically pauses longer at sentence endings, commas, and long words
- **Live Speed Control**: Adjust WPM in real-time with buttons or arrow keys
- **Clickable Progress Bar**: Jump to any position in the text
- **Focus Mode**: Hide distractions and show only the current word
- **Selection Support**: Speed read just the selected text, or the entire note

## Usage

1. Open any note in Obsidian
2. Run the command **Speed Reader: Start speed reading** or click the book icon in the ribbon
3. Optionally select text first to read only that portion

## Keyboard Controls

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` / `→` | Skip 10 words backward/forward |
| `↑` / `↓` | Increase/decrease speed by 25 WPM |
| `F` | Toggle focus mode |
| `Esc` | Close reader |

## Settings

- **Reading speed**: Set your default WPM (100–1000). Start with 200–300 and gradually increase as you get comfortable.

## Installation

### From Obsidian Community Plugins

1. Open **Settings → Community plugins**
2. Select **Browse** and search for "Speed Reader"
3. Select **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/madhusudan-kulkarni/obsidian-speed-reader/releases/latest)
2. Create a folder: `<vault>/.obsidian/plugins/speed-reader/`
3. Copy the downloaded files into that folder
4. Reload Obsidian and enable the plugin in **Settings → Community plugins**

## License

[0-BSD](LICENSE)
