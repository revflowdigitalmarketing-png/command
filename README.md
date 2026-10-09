# Command

Rahul's personal dashboard for his businesses (RevFlow, WEBLIT, LARPING), clients, promises, money and trips.
Plain HTML, CSS and JavaScript. No framework, no build step, no npm.

**Live app:** https://claude.ai/artifact/2XuV3LRPynj1GMK3w4RDZ6 (Rahul's private claude.ai page)

## Files

| File | What's in it |
|---|---|
| `index.html` | Page structure: sidebar, all pages, icons |
| `styles.css` | All design. Colours and tokens are at the top in `:root` |
| `js/core.js` | Helpers, app state, saving and syncing |
| `js/home.js` | Home: focus list, timeline, streak, folders |
| `js/businesses.js` | Businesses, client folders, client page |
| `js/word-larping.js` | LARPING (glitches + reels), My Word (promises) |
| `js/money.js` | Money: summary, trip cards, things to buy |
| `js/calendar.js` | Google Calendar |
| `js/ai.js` | Sort notes, Plan my day, Ask |
| `js/sheets.js` | Edit pop-ups |
| `js/events.js` | Clicks and keyboard, plus startup. **Must load last** |
| `assets/` | Images (banner, Dubai, Bali) |

The JS files share one global scope and load in the order listed in `index.html`.

## Working together (Rahul + Claude + Siri)

1. **Pull before you start**: `git pull`
2. Make small changes and commit often, with clear messages.
3. **Push when done**: `git push`
4. Try not to edit the same file at the same time. Tell each other which file you're working in.
5. To put changes live, Rahul asks Claude to publish. Claude publishes `main` to the same link, so all saved data stays.

## Running it locally

Open `index.html` in a browser, or use any static server (for example `npx serve`).

Outside claude.ai, saving falls back to this browser only, and Sort notes / Ask / Google Calendar show a message instead of working. **This is expected.** Those features come from claude.ai through `window.claude.use(...)` (`db`, `user`, `sample`, `mcp`).

## Don't break these

- The `useCap(...)` / `claude.use(...)` calls and `initStore`, `saveItem`, `saveSettings`.
- Data field names: `kind`, `title`, `client`, `biz`, `due`, `time`, `status`, `stage`, `amount`, `created`, `doneAt`. The live data depends on them.
- Keep it plain HTML/CSS/JS. No React/Tailwind conversion. External scripts can only come from cdnjs.cloudflare.com, and fonts from Google Fonts.

## Design rules (from Rahul)

- Dark grey and white only. Inter font. Small corner radius.
- No gradients and no glow. Thin subtle lines only where they're already used.
- Few cards, plain wording, nothing that looks "AI-generated".
- Nothing may overlap. Check phone width (~390px).
- Animations use transform and opacity only, so they stay smooth at 60fps.
