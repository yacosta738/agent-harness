---
name: ratatui-tui
description: >
  Use when creating, editing, or reviewing Rust terminal user interfaces built with Ratatui,
  crossterm, terminal widgets, keyboard navigation, async event loops, or TUI release hardening.
license: Apache-2.0
metadata:
  author: yacosta738
  version: "1.0"
---

# Ratatui TUI Development

## Overview

Ratatui is a Rust library for fast, lightweight terminal user interfaces. Build TUIs as small
state machines: state changes happen in `update`, drawing happens in `view`, and terminal setup /
cleanup stays isolated from application logic.

Primary references: <https://ratatui.rs/> and <https://docs.rs/ratatui/>.

## When to Use

- Creating a new Rust TUI with `ratatui`.
- Adding widgets, layouts, popups, status bars, lists, tables, charts, or gauges.
- Implementing keyboard navigation, focus, selection, scrolling, or input modes.
- Adding async terminal events with `crossterm::event::EventStream` and `tokio::select!`.
- Reviewing TUI code for terminal cleanup, panic safety, rendering performance, or release quality.

Do not use for non-interactive CLIs; prefer normal `clap` command patterns there.

## Project Setup

Minimal dependencies:

```toml
[dependencies]
ratatui = "0.30"
crossterm = "0.29"
color-eyre = "0.6"
```

Async event loop dependencies:

```toml
[dependencies]
ratatui = "0.30"
crossterm = { version = "0.29", features = ["event-stream"] }
color-eyre = "0.6"
tokio = { version = "1", features = ["full"] }
futures = "0.3"
```

Release profile for distributed binaries:

```toml
[profile.release]
lto = true
codegen-units = 1
panic = "abort"
strip = true
```

## Core Architecture

Use an Elm-style loop:

```text
Model -> Message -> Update -> View
  ^                         |
  +-------------------------+
```

Keep responsibilities separate:

| Layer                   | Owns                                 | Avoid              |
|-------------------------|--------------------------------------|--------------------|
| `App` / model           | State, selections, mode, loaded data | Terminal I/O       |
| `Message` / action enum | User and system events               | Rendering details  |
| `update`                | State transitions                    | Drawing widgets    |
| `view` / `ui`           | Layout and widgets                   | Mutating app state |
| `tui` / terminal module | raw mode, alternate screen, cleanup  | Business rules     |

```rust
struct App {
    selected: usize,
    should_quit: bool,
}

enum Message {
    Up,
    Down,
    Quit,
}

impl App {
    fn update(&mut self, msg: Message) {
        match msg {
            Message::Up => self.selected = self.selected.saturating_sub(1),
            Message::Down => self.selected += 1,
            Message::Quit => self.should_quit = true,
        }
    }

    fn view(&self, frame: &mut ratatui::Frame) {
        use ratatui::widgets::{Block, Paragraph};

        let text = format!("Selected: {}", self.selected);
        let widget = Paragraph::new(text).block(Block::bordered().title("App"));
        frame.render_widget(widget, frame.area());
    }
}
```

## Layout and Widgets

Prefer constraint-based layouts that survive tiny tmux panes and large terminals:

```rust
use ratatui::layout::{Constraint, Layout};

let [header, main, footer] = Layout::vertical([
    Constraint::Length(1),
    Constraint::Fill(1),
    Constraint::Length(1),
])
.areas(frame.area());

let [left, right] = Layout::horizontal([
    Constraint::Percentage(35),
    Constraint::Fill(1),
])
.areas(main);
```

Use built-in state types before inventing your own:

- `ListState` for `List` selection.
- `TableState` for `Table` selection.
- `ScrollbarState` for scrollbars.
- Custom `StatefulWidget` only when widget-local render state is truly needed.

```rust
frame.render_stateful_widget(list, area, &mut self.list_state);
```

## Input and Event Handling

Map raw terminal events into domain messages. Do not scatter state mutation across key handlers.

```rust
use crossterm::event::{Event, KeyCode};

fn event_to_message(event: Event) -> Option<Message> {
    match event {
        Event::Key(key) => match key.code {
            KeyCode::Char('q') | KeyCode::Esc => Some(Message::Quit),
            KeyCode::Up | KeyCode::Char('k') => Some(Message::Up),
            KeyCode::Down | KeyCode::Char('j') => Some(Message::Down),
            _ => None,
        },
        _ => None,
    }
}
```

Async loop pattern:

```rust
use crossterm::event::EventStream;
use futures::StreamExt;
use tokio::select;

async fn run(mut app: App, mut terminal: ratatui::DefaultTerminal) -> color_eyre::Result<()> {
    let mut events = EventStream::new();

    while !app.should_quit {
        terminal.draw(|frame| app.view(frame))?;

        select! {
            Some(Ok(event)) = events.next() => {
                if let Some(msg) = event_to_message(event) {
                    app.update(msg);
                }
            }
        }
    }

    Ok(())
}
```

## Styling Rules

Use `Stylize` helpers for readable styling:

```rust
use ratatui::style::Stylize;
use ratatui::text::Line;

let help = Line::from(vec![
    " q ".bold().cyan(),
    "quit ".dim(),
    " ↑↓ ".bold().cyan(),
    "navigate ".dim(),
]);
```

Guidelines:

- Prefer semantic contrast over hardcoded white/black.
- Use `.dim()` for secondary text, `.red()` for errors, `.yellow()` sparingly for warnings.
- Keep status bars and help bars one line when possible.
- Avoid allocating or recomputing expensive display data every frame; precompute in
  update/background tasks.

## Terminal Safety and Errors

Install error hooks early and always restore raw mode / alternate screen on panic or error.

```rust
use color_eyre::eyre::{Result, WrapErr};

fn main() -> Result<()> {
    color_eyre::install()?;
    install_terminal_panic_hook();
    run().wrap_err("TUI crashed")
}

fn install_terminal_panic_hook() {
    let original_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |panic_info| {
        let _ = crossterm::terminal::disable_raw_mode();
        let _ = crossterm::execute!(
            std::io::stdout(),
            crossterm::terminal::LeaveAlternateScreen
        );
        original_hook(panic_info);
    }));
}
```

Rules:

- No `unwrap()` / `expect()` outside tests unless a value is a compile-time invariant and
  documented.
- Use `color-eyre` context with `.wrap_err(...)` at I/O boundaries.
- Cleanup must happen on normal exit and panic paths.

## Common Mistakes

| Mistake                                       | Fix                                                          |
|-----------------------------------------------|--------------------------------------------------------------|
| Mutating app state inside render code         | Move mutation to `update`; render from immutable state       |
| Handling `q`, arrows, and modes in many files | Centralize event-to-message mapping                          |
| Recreating heavy widgets/data every frame     | Cache derived data and update it only when state changes     |
| Forgetting raw-mode cleanup on panic          | Install a panic hook and isolate terminal lifecycle          |
| Hardcoding fixed widths                       | Use `Constraint::Fill`, percentages, and graceful truncation |
| Using a TUI for a one-shot command            | Build a normal CLI instead                                   |

## Verification Checklist

Before calling a Ratatui TUI ready:

- [ ] `cargo fmt` passes.
- [ ] `cargo clippy --all-features` is clean or warnings are explicitly justified.
- [ ] No `unwrap()` / `expect()` outside tests without documented invariant.
- [ ] State transitions live in `update`, not `view`.
- [ ] Terminal raw mode and alternate screen are restored on normal exit and panic.
- [ ] Keyboard navigation works in the target terminal and tmux if supported.
- [ ] Layout remains usable in narrow and short terminal sizes.
- [ ] Release build succeeds with `cargo build --release` when shipping a binary.
