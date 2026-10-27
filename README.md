# Mind Map

*A first-person journey through Carl Jung's model of the psyche.*

Mind Map started as a Java text adventure: you typed `n`, `e`, `w` or `s` to move between five
rooms of the Jungian psyche. It is now an exploratory first-person RPG in the browser, built with
[three.js](https://threejs.org/).

There is no way to win. Jung saw individuation as a lifelong process rather than a goal, so
the game is a place to wander. You walk the realms, talk with the archetypes, integrate the
complexes that roam the unconscious and write what you find in your **Red Book**.

## Play

There is no build step. Serve the folder with any static file server and open it in a browser:

```sh
npx serve .            # or: python3 -m http.server
```

Then open the printed URL (for example `http://localhost:3000`). three.js is loaded from the
jsDelivr CDN through an import map in `index.html`.

| Key | Action |
| --- | --- |
| `W A S D` / arrow keys | Walk |
| Mouse | Look |
| `Shift` | Run |
| `Space` | Jump |
| Left click (hold) | Cast **Insight** |
| `F` / right click | Release **Radiance**, a burst around you |
| `E` | Speak or interact, and advance dialogue |
| `J` / `Tab` | Open the Red Book |
| `M` | Mute |
| `Esc` | Pause |

## The psyche

The layout follows the original Java map: the Self is at the centre, the Ego lies north-east,
and the Shadow lies south-west.

| Realm | What you'll find |
| --- | --- |
| **The Self** | A golden mandala and a sanctuary that restores you. **Philemon**, Jung's inner guide, lives here. Every page you write adds a shard of light that orbits the heart of the Self. |
| **The Ego** | A bright marble hall of columns. **The Persona** admires itself in four mirrors, and you can break them. |
| **The Personal Subconscious** | Violet mist, drifting doors, chairs and clocks. **The Anima** waits here, along with buried memories and the Repressed Memories that guard them. |
| **The Shadow** | Black obsidian and embers. **Your Shadow** watches you. Attacking it only makes it grow; face it and accept it, and it walks beside you for the rest of the game. |
| **The Collective Unconscious** | A cosmic void with four archetype monoliths to awaken (the Great Mother, the Hero, the Trickster and the Divine Child) and the Archaic Complexes that circle them. |

Dream symbols are hidden around the realms: the Sun, the Key, the Serpent, the Ouroboros, the
Philosopher's Stone and the World Tree. Every so often a **golden scarab** of synchronicity
appears near you. Catch it if you can.

Complexes are never killed. When Insight reaches them, they dissolve into light and you gain
Consciousness (XP). Your stats are **Composure** (health) and **Libido**, Jung's word for
psychic energy (mana). If you are overwhelmed, you simply wake up at the Self.

## Code

```
index.html        page shell, HUD markup and import map
style.css         HUD, dialogue, Red Book and overlays
src/main.js       game loop, player, input, interactions and Red Book
src/world.js      realm geometry, procedural textures, walkability and atmosphere blending
src/entities.js   complexes, your Shadow, NPCs, projectiles, particles and props
src/data.js       realms, dialogue, archetypes, symbols and Red Book pages
src/ui.js         HUD, dialogue box, minimap and Red Book panel
src/audio.js      procedural Web Audio sound effects and realm drones
legacy/           the original Java text adventure
```

All of the art and sound is generated procedurally, so the game uses no asset files.

Created by Matt Lee.
