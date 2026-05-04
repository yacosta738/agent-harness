# Format Presets Reference

Choose the output format from the user's target channel. If missing, ask one concise question. If
the user says "blog header" or "post image", use the defaults below.

| Use Case                |    Ratio | Resolution | Notes                                |
|-------------------------|---------:|-----------:|--------------------------------------|
| Blog post header        |     16:9 |  1920×1080 | Best for article hero images         |
| OG image default        | 16:9-ish |   1200×630 | Good fallback for web/social sharing |
| LinkedIn feed wide      |   1.91:1 |   1200×628 | Link-preview style                   |
| LinkedIn square         |      1:1 |  1200×1200 | Feed-native square post              |
| LinkedIn portrait       |      4:5 |  1080×1350 | Strong mobile feed presence          |
| YouTube thumbnail       |     16:9 |   1280×720 | Needs larger title/contrast          |
| Twitter/X card          |      2:1 |   1200×600 | Wide and compact                     |
| Poster / infographic    |    16:10 |  1920×1200 | More room for multiple panels        |
| Story / vertical poster |     9:16 |  1080×1920 | Mobile-first, use fewer panels       |

## Defaults

- If user says **blog/article/header**: 16:9, 1920×1080.
- If user says **LinkedIn post** without more detail: 4:5, 1080×1350 for stronger feed visibility.
- If user says **thumbnail**: 16:9, 1280×720.
- If user says **social card/OG**: 1200×630.
- If user gives no use case: ask for use case before final prompt.

## Midjourney Aspect Flags

- 16:9 → `--ar 16:9`
- 1.91:1 → `--ar 191:100`
- 1:1 → `--ar 1:1`
- 4:5 → `--ar 4:5`
- 9:16 → `--ar 9:16`
- 16:10 → `--ar 16:10`
