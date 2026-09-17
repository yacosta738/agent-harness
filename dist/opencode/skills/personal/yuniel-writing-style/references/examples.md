# Style examples — Yuniel Acosta

Before/after comparisons for calibrating the right tone.

---

## Example 1: Article opening

### WRONG — generic AI version

"In this article we will explore the characteristics and advantages of the Neovim text editor. It's
important to note that this editor has gained popularity in the developer community for its
customization capabilities and performance."

### RIGHT — Yuniel's style

"About a year ago I decided to replace VS Code with Neovim as my main editor. It wasn't an impulsive
decision — I'd spent months watching other people work with it and feeling increasingly curious.
What I didn't expect was how hard the path would be before I became productive, or how satisfying it
would feel after."

**Why it works:** Real time anchor, personal decision, anticipates friction, creates expectation.

---

## Example 2: Explaining a technical problem

### WRONG — generic AI version

"One of the most common drawbacks of using macOS is the lack of native support for Microsoft's NTFS
file system, which can hinder interoperability with external storage devices."

### RIGHT — Yuniel's style

"The second problem I ran into quickly was that macOS doesn't support writing to NTFS file systems.
This made it impossible to modify files on my external hard drives or USB drives — even on the
latest versions of the OS. There are tools that add this, but most of them cost money."

**Why it works:** First person, narrative order (problem → consequence → market reality), no empty
adjectives.

---

## Example 3: Recommending a tool

### WRONG — generic AI version

"Raycast is an excellent alternative to Ulauncher that offers superior performance and a more robust
extension ecosystem, making it a highly recommended option for macOS users."

### RIGHT — Yuniel's style

"That changed when I found Raycast. It outperforms Ulauncher by a wide margin — better performance,
extensions for almost everything, and solid support. Since switching I haven't hit a single
compatibility issue, which is more than I can say for Ulauncher, which would occasionally break one
of its extensions for no obvious reason."

**Why it works:** Real comparison from personal experience, not marketing. Mentions the past
context. Admits the past problem.

---

## Example 4: Conclusion

### WRONG — generic AI version

"In conclusion, Neovim is a powerful tool that can significantly improve developer productivity. We
hope this article has been useful and encourages you to explore the possibilities this editor
offers."

### RIGHT — Yuniel's style

"Neovim isn't for everyone. And I say that without any criticism of people who don't use it. The
initial time investment is real. If you're working on tight deadlines or just don't want to spend
weeks configuring an editor, VS Code is a perfectly valid choice. What I can say is that, a year in,
I wouldn't go back."

**Why it works:** Opinion with nuance, acknowledges valid alternatives, closes with a personal
stance without imposing it.

---

## Example 5: Introducing a technical term

### WRONG — generic AI version

"LSPs (Language Server Protocols) are protocols that enable communication between text editors and
language servers to provide features such as autocomplete, code navigation, and error detection."

### RIGHT — Yuniel's style

"To get autocomplete and error detection in Neovim you need to configure an LSP — basically a
background process that understands your programming language and tells the editor what's wrong and
what you can type next. For Rust I used rust-analyzer, which works well once you have it installed."

**Why it works:** Defines the term with a functional analogy, not the formal definition. Immediately
contextualizes it with a real example.

---

## Example 6: Technical data

### WRONG — generic AI version

"The transformation process demonstrated notable efficiency in terms of execution time and storage
resource usage."

### RIGHT — Yuniel's style

"Execution time for converting the raster to NetCDF came in at about 9.95 seconds, and the HDF
conversion at 6.11 seconds. That's a solid result given the volume of data being processed. On disk,
the HDF went from 7.3 MB down to 515 KB — a meaningful reduction."

**Why it works:** Concrete numbers, reference comparison, personal judgment on the result.

---

## Example 7: Paragraph splitting (240-char rule)

### WRONG — one long paragraph

"When I first started using Neovim I spent most of my time just learning the different modes —
normal, insert, visual, and command — and understanding why the editor works this way, which seemed
like unnecessary friction at first but later made complete sense once I understood the philosophy
behind modal editing and how it eliminates the need to constantly switch between keyboard and
mouse."

### RIGHT — split at natural pause

"When I first started using Neovim I spent most of my time just learning the different modes —
normal, insert, visual, and command — and understanding why the editor works this way.

It seemed like unnecessary friction at first. Later it made complete sense. Once you understand the
philosophy behind modal editing, the whole thing clicks — you stop reaching for the mouse."

**Why it works:** Each paragraph carries one idea. Rhythm alternates naturally. Easier to scan and
re-read.
