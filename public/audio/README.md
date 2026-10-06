# Audio clips

Drop approved audio files in this folder and map each one in `manifest.json`.
Supported extensions are `.wav`, `.mp3`, `.ogg`, and `.webm`.

Each clip record must identify its source and license:

```json
{
  "version": 1,
  "clips": {
    "gunshot": {
      "file": "honk-47-shot.ogg",
      "source": "User-provided recording",
      "license": "User-owned"
    }
  }
}
```

Available event names are `gunshot`, `explosion`, `honk`, `reload`, `footstep`,
`hit`, and `ui`. Keep an event unmapped until its clip and attribution are ready;
unmapped sounds stay silent and do not issue file requests.
