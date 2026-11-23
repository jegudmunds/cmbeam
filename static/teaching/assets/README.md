# Shared course theme

Edit `static/teaching/assets/course.css` to change the design of both STÆ211 and EÐL408.
This is the canonical definition of typography, colors, header, navigation, home cards, spacing and responsive layout.
Fonts are stored alongside it in `fonts/`; all font URLs are relative to the stylesheet.

Each course keeps `assets/site.css` as a compatibility entry point. It imports `../../assets/course.css` first and contains only course-specific rules:
- STÆ211: PDF notes panels.
- EÐL408: chapter contents panel, notebook outputs, Python cells, quizzes and flashcards.

The Python workspace also imports the shared theme, followed by its workspace and dark-mode rules.
Do not edit common colors or heading fonts in course overrides. Use `--font-heading`, `--font-body`, and `--font-code`.

EDL408's build bundles a generated copy of this theme and the fonts for standalone/ChatGPT hosting.
Its publishing workflow switches the imports back to the canonical stylesheet when copying to CMBeam.
Those generated copies are not independently maintained. Existing standalone deployments refresh on the next course build.

Changing the shared theme deploys to both CMBeam courses without rebuilding their HTML.
Check both homepages, a chapter, both schedules, and EDL408's Python workspace at desktop and mobile widths after changes.
