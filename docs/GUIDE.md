# Feature guide

Every feature of Control Center, described in full. For installing, running and backups, see the [README](../README.md).

*English · [Tiếng Việt](HUONG-DAN.md)*

## Contents

- [The idea](#the-idea)
- [Features](#features)
- [The editor](#the-editor)
- [How the app saves](#how-the-app-saves)
- [Data format](#data-format)

## The idea

One place for the work and for the thinking about the work. A task is not just a line of title text — every task carries a note field you write in like a Notion page, so all the scraps attached to it have somewhere to go instead of scattering.

The self-imposed constraint: **it runs offline, the data belongs to the user, and it lives in a file you can hold on to.** That decides every technical choice below. The app began with no backend at all, storing everything in `localStorage`, but that traps the data inside one browser profile: clear the cache and it's gone, switch Chrome accounts and it isn't there. So `serve.py` now keeps the data in a file — still on your machine only, still listening on `localhost` only.

## Features

**Work board** — three columns, `To do / Doing / Done`, with drag and drop between them. Each task has: an area (Work / Life / Other), a priority (Low / Medium / High), a progress percentage, a due date, tags, a sub-task list, and a note.

**Life board** — a separate kanban board for tasks in the Life area, built the same way as the work board, which then holds only Work and Other. Both boards share the same calendar, reminders and overview.

**Later** — where things you have not committed to go, across every area. Tasks here stay off the board, the calendar and the reminders, and don't count towards the overview. Type in the box at the top and press Enter to jot one down; each line shows its age since creation and a **→ To do** button that sends it to the bottom of the To do column. The other direction: drag a card from the board onto **Later** in the sidebar, or pick the **Later** status in the task panel or the new-task form.

**Habits** — things that repeat on fixed weekdays, tracked separately rather than on the board: a task is done once and finished, a habit is a chain with no end, and mixing them would flood the board and skew the overview. Each habit has a name, a colour, a kind (**To keep** / **To drop**), the weekdays it applies to, and an **implementation intention** in the form "after what, and where" — the single strongest lever in the research on habit formation. A habit you want to drop also declares a **replacement behaviour**: the craving still arrives, what you can change is the response, so you tick the days you managed the replacement.

Each habit has a **Why** section — why it is worth doing, the thing you will need to reread on exactly the day you don't feel like it. It is a full editor like a task note (type `/` for blocks, paste images and files), and it appears in two places: inside the create/edit form, alongside the other fields and saved only when you click **Save**; and on the card as a foldable **▸ Why** line, where editing saves immediately. Folded, it shows a one-line preview, and the app remembers whether you left it open or closed.

Each card carries a twelve-week grid in the style of a contribution graph — columns are weeks, rows are weekdays, so scanning down a column shows which day you keep breaking on. Click a cell to mark or unmark that day. The card shows the **current streak** and the **completion rate**; missing one session earns no penalty, and only a second consecutive miss raises a warning — because one miss barely affects the road to automaticity, while consecutive misses are where a habit comes apart.

Habits **due today** appear as a quick-tick strip at the top of the Work board and the Life board, with the streak count beside each. Ticking one plays a short celebration: it is the immediate positive feeling that binds a behaviour into a habit, not the number of repetitions.

When a stretch just will not work — illness, travel, a change of rhythm — press **Pause** on the card instead of deleting the habit. A paused habit leaves the strip for today, stops asking to be ticked and moves to the bottom of the list. The days off are treated as off schedule: they never count as missed and never enter the completion rate, so pressing **Resume** carries the streak on from the same number. The history and the twelve-week grid stay untouched.

**Focus** — a pomodoro timer for deep work and against task-switching. The defaults are 40 minutes of work, a 10-minute break, and a 15-minute long break after every 3 sessions; every value is editable under **⚙ Settings** inside the Focus view, and each group has a **Restore defaults** button. Changing a duration while the clock is running only takes effect from the next session — once you have pressed start, the schedule holds.

- **The queue** holds up to 3 tasks (configurable) and **only accepts tasks in the Doing column**: drag a Doing card onto the Focus block in the sidebar, or pick one inside the Focus view — the picker groups by priority with the high ones first, and every queued task shows its priority label. The task at the head of the queue is the one the next session runs on. Each session is bound to exactly one task — swapping tasks mid-session needs a confirmation and is recorded as a context switch, unless the old task is already done. A task that leaves the Doing column (finished, sent back to To do, set aside or deleted) leaves the queue by itself.
- **The sidebar block** shows the clock, the task and the start/pause button. If it's in the way, click **Collapse** next to the Focus label: the block shrinks to one thin line with the phase and the time left, and clicking that line opens it again.
- **During a session**: when something else comes to mind, type it into the **Save for later** box (in the Focus view or on the full-screen timer) and press Enter — it goes to Later and you return to what you were doing. **⏸ Pause** when you have to step away; pause for more than 2 minutes and the app asks whether you are carrying on or abandoning the session.
- **When a session ends**: a chime (synthesised, with adjustable volume), a system notification if you have allowed one, then a focus rating from 1–5 and a **note for next time** — that line reappears the next time you sit down to that task. The break screen suggests getting away from the screen; you can skip a break, but the app records that you did.
- **Overtime** (off by default; set the number of minutes under the **Durations** group): being in flow when the timer runs out no longer means stopping mid-thought. At the end of the session the app simply chimes, the clock turns amber and counts the extra time up (**+03:20**); finish the thought and click **✓ End session**, or leave it — once the allowed minutes are up the clock stops on its own. The overtime counts in full towards the day's focus minutes (the daily log reads "12′ overtime"), but **the tree was already fixed at the moment the session was complete**, so working longer earns no extra reward. The session still counts as a full one; the celebration, the rating and the break all wait for the real end. If the app is closed during overtime, at most the allowed minutes are counted.
- **Streaks**: a weekday counts when you complete 2 sessions. You may miss one weekday; two consecutive misses reset it to zero. A weekend with no work doesn't break the streak, and a weekend that does meet the bar still adds to it. Sessions abandoned part-way are recorded (with the minutes worked) but don't count as completed ones.
- **The garden**: every completed session plants a tree, and every abandoned one leaves a withered tree. Pick the species on the clock before you start — eight of them: Pine, Oak, Cherry, Red maple, Birch, Palm, Cactus, Bamboo — and the app remembers your last choice. Trees grow through three stages by minutes worked: under 15, from 15, from 40 — while the clock runs the tree on it grows along, though overtime doesn't count here. Hover a tree to see the task, the time and the minutes of that session.
- **The focus-hours chart** and the garden can be viewed by **Day / Week / Month / Year**, with ‹ › to step back and forward; the app remembers the view you chose. The day view splits the chart into 24 hourly columns. The chart counts every session, abandoned ones included, because that time was still time spent working.
- **Full screen** (the **⤢** button, `Esc` to leave): the middle of the screen holds nothing but the clock and the buttons; the task name and the save-for-later box sit in a small drawer at the top left, folded by default, opened with **▸**. The background changes with the phase — **Focus / Short break / Long break** — and each phase has its own colour, its own background image (PNG transparency preserved) with adjustable opacity, and a dark or light overlay so the text stays readable.

The clock works from timestamps rather than by counting ticks, so F5, switching tabs or closing the app mid-session never makes it drift; a session that ran out while the app was closed is recognised when you open it again. The clock also shows in the tab title. The Focus view carries today's progress, the last 7 days, the week, the month, the longest streak, and a summary of the day (focus minutes, tasks, save-for-later count, pause count, average focus rating, and the list of sessions).

**Day plan** — the shape you expect a day to take, which is a different thing from a list of tasks: sleep, commute, work, meals, rest are blocks of life that run back to back, not separate events. A day is drawn two ways at once: a **24-hour ribbon** that fits the whole day in one glance and leaves the gaps visible, and a **vertical list** underneath where you edit each block's name, kind and hours. Blocks come in six kinds — Sleep, Self, Commute, Work, Meals, Rest — each with its own colour, and the app totals the hours per kind under the ribbon. The grid steps in 15 minutes rather than 30, because real boundaries so often land on the quarter hour.

A day's blocks are copied from a **template** the first time you open that day, the same way journal pages are created, so editing a template later never rewrites days that have already been. Each weekday points at its own template (**Template per weekday**), and days you have never opened take the template for that weekday. Edit the blocks of the day you are looking at, then **⤓ Save to template** writes them back; days already opened keep what they had. You can create, rename and delete templates. **+ Add block** drops a new block into the first remaining gap in the day, and a block that overlaps the one before it is flagged, since overlapping blocks would double-count the hours.

**Tags** — one shared list, each tag with its own colour. Click **Manage** next to the Tags section in the sidebar to add, rename, delete and recolour — pick from a palette of 72 colours or any colour at all (colour picker or hex). Renaming a tag onto an existing one prompts to merge the two. When tagging a task, the existing tags are offered to click; typing a new name and pressing Enter creates a new one.

**Task panel** — click a task to open the drawer on the right: edit every field, tick sub-tasks, write the note.

**Calendar** — three modes, **Day / Week / Month** (the app remembers the last one you used). Day and Week are hour grids in the style of Google Calendar: tasks with a time sit in their slot, tasks with only a due date sit in the "All day" row. Click an empty slot to create a task at that hour, click a day name to see that day alone. Month is a month grid: tasks appear on their due date, and days with a journal entry are marked.

**Day schedule in the sidebar** — a 24-hour timeline in the style of Google Calendar, divided into 30-minute cells. Click an empty cell to open the new-task form with the date and time filled in. Click a block to open that task. Overlapping items are laid out side by side. The **⤢** button opens the full week view.

**Times & reminders** — every task can carry a start time, a duration and a reminder lead time (30 minutes by default), both in the new-task form and in the detail panel. The time is attached to the due date. When the lead time is reached the app shows a toast, adds a notification to the **bell** in the top bar, and fires a system notification if you have allowed one. Reminders only run while the app is open.

**Journal** — one or more pages per day, written freely. The left column lists the days that have an entry, grouped by month, with a **Today** button above it; the right side holds the page itself. A day's pages appear as tabs, with **+** to add one, **✎** to rename and **✕** to remove. The header also shows how many tasks are due on the day you are reading.

**Notes** — pages not attached to any date, nested like Notion. The left column is the page tree: click ▸ to open sub-pages, hover a page and click **+** to add a child. Each page has a title, tags (shared with tasks), content in the same editor, a **created** date and a **last edited** date (updated when the title, the content or the tags change). Pin a page and it appears under **Pinned** at the top of the tree; the five most recently edited appear under **Recent** below that. **Move into…** moves a page, with its children, into another page or back to the top level. Dragging does the same thing by hand: drop a page on the top or bottom edge of another to place it before or after, or on the middle of a page to make it a child. Typing in the search box or clicking a tag in the sidebar turns the tree into a flat list of matching pages, most recently edited first. Deleting a page sends its whole subtree to the **Trash**, and restoring brings the subtree back.

**Overview** — the top row is all about today: tasks due today, overdue tasks, tasks finished today, focus sessions against the daily goal, habits ticked, and the streak of days with a journal entry. Clicking a tile jumps to the page behind it. Below, **Needs attention** lists overdue tasks and habits sitting at a deciding session (click a row to open it); the rest is the status breakdown, seven-day charts for finished tasks and for deep-work minutes, and the split by area and by priority.

**Filtering and search** — by tag (sidebar) and full-text across titles, tags and notes. The Work board and the Life board additionally have a **Filter** button in the toolbar (showing how many filters are on), which opens a panel: time range (today / 7 days / this month / all), priority (several at once), due state (overdue / due today / no due date), area Work / Other (work board only), and card ordering (manual / by priority / grouped by priority).

**Interface language** — Vietnamese and English, switched with the 🌐 button at the bottom of the sidebar. The language is remembered per browser rather than in the data file, so switching reloads the page; two people sharing a data file can each read it in their own language. Strings live one per line in `js/i18n.js`; anything without a translation falls back to Vietnamese rather than disappearing.

## The editor

Task notes and journal pages use TipTap (ProseMirror). Type `/` to open the block menu, or use the markdown shortcuts:

| Type | Becomes |
|---|---|
| `# ` `## ` `### ` | Large / medium / small heading |
| `[] ` | Checklist (tickable) |
| `- ` | Bulleted list |
| `1. ` | Numbered list |
| `> ` | Quote |
| ` ``` ` | Code block |
| `---` | Horizontal rule |

Select text to bring up the floating format bar (bold, italic, strikethrough, code, link). Links are recognised as you type and open in a new tab.

**Images** — paste (Ctrl+V), drag an image file in, or type `/` and pick **Image**. Images with a long edge over 2560px (or heavier than 800KB) are resized to 2560px WebP; smaller images keep their original file. Double-click an image to open it full size in a new tab.

**File attachments** — drag or paste any file (PDF, Word, Excel, zip…) into a note, or type `/` and pick **Attachment**. The file appears as a card with its name, its size and a **Download** button. PDFs, images, audio, video and text/code files (txt, md, csv, json…) also get a **View** button that opens them in a new tab; Word, Excel and PowerPoint can only be downloaded. `.html` and `.svg` files are always shown as plain text and never executed. Each file is capped at 25MB. Select a card and press Backspace to remove it.

## How the app saves

Every change is written to **`data/dieukhien.json`** (through `serve.py`, after roughly 0.8 seconds). `localStorage` is now only a buffer, so clearing the cache or opening the app under a different Chrome account still shows all of your data. The sidebar reports **Saved to disk** with the time; when a write fails it turns red and a banner appears.

- **Automatic backups** in `data/backups/`: the first version each day (`ngay-*.json`, 30 days kept); the version from just before an import (`truoc-khi-nap-*`); browser-held data that was not used (`trinh-duyet-*`). To restore, use **Import** on one of those files. The names are Vietnamese because that is the language the app was first written in.
- **Two windows don't overwrite each other.** Every write carries a version tag; if another window or profile wrote first, the server refuses, this window's version is filed into `data/backups`, and the app asks you to reload.
- **The first time you open this version on a profile that holds older data**, while `data/dieukhien.json` does not yet exist, the app asks whether to promote the browser's data to be the real data (quoting the task count). A different profile holding its own data that never reached the file is not asked about — that data is filed into `data/backups` and the app uses what is in the file.
- If the server stops mid-session, changes stay in the browser and are flagged; the next time you open the app with the server running, they are sent up automatically.

Also:
- **Link a file on disk** (Chrome/Edge): pick a `.json` file, and from then on every change is also written to that real file. The handle is kept in IndexedDB, so opening the app later takes one click to reconnect.
- **Export / Import** JSON by hand, for backups or for moving to another machine.

## Data format

The data format is plain JSON: `{ tasks: [], journal: {}, notes: [], habits: [], focus: {}, settings: {} }`. Readable by eye, editable by hand.

`focus.log` keeps every session and break that has happened, abandoned ones included, so they can be analysed later: `k` (`work` / `short` / `long`), `a` / `b` (start and end timestamps, ms), `plan` (planned minutes), `ms` (actual run time — can exceed `plan` when overtime was used), `done` (ran the full duration). Work sessions also carry `tid`, `title`, `rate` (1–5), `next`, `pause` (number of pauses), `cap` (save-for-later count), `sw` (task switches) and `paused` (total paused time, ms). The focus screen's background images are packed into the `images` field as well.

Images and attachments do not live in `localStorage` (capped around 5MB) but in IndexedDB; the note itself only holds `<img data-img="id">` / `<div data-file="id" data-name data-size>`. Exported files and linked files carry an extra `images: {id: data URL}` field holding the images and files currently in use — the field name is unchanged so older backups still load — so a backup is complete, and importing puts the images back into IndexedDB.

There are upgrade paths for older data: journals in the old format (one string per day) become multi-page journals on load, and notes written in markdown or in the older HTML are converted into something TipTap understands.
