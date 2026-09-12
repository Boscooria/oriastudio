# ORIA STUDIO — Portfolio base

Static one-page portfolio for Bosco Oria. It can be edited directly in Visual Studio Code and published with GitHub Pages, Vercel, Netlify or any static host.

## Files

- `dist/index.html`: all text, project cards, links and metadata.
- `dist/styles.css`: visual system, layout and responsive rules.
- `dist/script.js`: drag, touch, keyboard, reset and scatter interactions.
- `dist/assets/`: the six demonstration images.

## Personalise it

1. Replace each image in `dist/assets/` while keeping the same filename, or change its `src` in `index.html`.
2. Change the project title and year inside each `<figcaption>`.
3. Replace `yourmail@example.com` with your real email address.
4. Edit the biography inside `.info-panel__content`.
5. Commit and push the whole project to GitHub.

The draggable interaction uses Pointer Events, so it works with a mouse, trackpad, touchscreen and keyboard arrow keys.
