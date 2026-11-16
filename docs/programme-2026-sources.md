# Where the 2026 programme in the game comes from

The game uses the real Musik i Lejet 2026 programme (16–18 July 2026) as far as it could be found
online in November 2026. The festival's own site had already switched to 2027, so the programme was
pieced together from press coverage. **It is incomplete and partly estimated.**

In `programme.py` every act has a last value `True` or `False`:

- `True`: the start time comes from a published source.
- `False`: the artist was announced for 2026, but the stage, the time or even the day is our guess.

Sources used:

- elle.dk, "Musik i Lejet 2026: Her er alt, du skal høre på årets festival" (start times for URO,
  Poul Krebs, Mekdes, Benjamin Hav & Familien, ICEKIID, Pil, KESI, Madsdamind, Giift, Burhan G,
  Christopher, Artigeardit).
- Frederiksborg Amts Avis / sn.dk, 20 March 2026 (names: KESI, Dodo & the Dodos, Burhan G,
  Sira Jovina, Kind mod Kind, Tabloid, Anton Westerlin DJ-set).
- gogoevents.dk and billet.dk programme guides as quoted by search results (Saveus at 21:00,
  GNAGS, Bisse, Guldimund, Rosa 22:35, Betty B 22:30, ABBAtizers 19:40, KIDD, Jonah Blacksmith).

To do before showing this to the festival: replace `REAL_ACTS` in `programme.py` with the printed
programme. Only names, stages and times are used: no artist photos, music or logos.
