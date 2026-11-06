---
name: neuer-aufgabentyp
description: Neuen Aufgabentyp (Übung) für Mathe-Duell hinzufügen - Generator, Katalogeintrag, Hilfe, Lösungsweg, Beschreibung/Lernziel, Prüfung, Version und Commit. Auslöser: "neuer Aufgabentyp", "neue Übung", "Aufgaben zu Kapitel …", "füge Aufgaben hinzu", Arbeitsblatt/Skript als Vorlage für neue Aufgaben.
---

# Neuer Aufgabentyp für Mathe-Duell

Ziel: Jede neue Übung ist mathematisch korrekt, abwechslungsreich, erklärt den Lösungsweg und passt zu Stil und Lehrplan der bestehenden ~300 Übungen. Regeln und Aufbau stehen in `CLAUDE.md`.

## 1. Auftrag klären (kurz)

Aus der Anfrage oder der Vorlage (Skript, Arbeitsblatt, Foto) bestimmen:
- **Kategorie und Kapitel**: Basiswissen / Jahr 1 / 2 / 3 und die Kapitelnummer (z. B. «M3 7b»). Ist das Kapitel noch `lockedChapter(…)`, wird es mit der ersten Übung zu `chapter(…)`.
- **Was genau geübt wird** (ein Lernziel pro Übung) und welcher `answerType` passt.
- **Zahlenbereich und Schwierigkeit** passend zur Stufe. Ist ein Taschenrechner nötig?

Nur nachfragen, wenn Kapitel oder Ziel wirklich unklar sind. Sonst eine sinnvolle Annahme treffen und sie am Schluss nennen.

## 2. Vorbild suchen

Eine ähnliche bestehende Übung im selben oder einem verwandten Kapitel suchen und deren Generator als Vorlage nehmen:
```bash
grep -n 'ex("m3-7' index.html          # Übungen eines Kapitels
grep -n 'function generateSystemWord' index.html
```
Vorhandene Hilfsfunktionen wiederverwenden (`rnd`, `rndNonZero`, `gcdFn`, `lcmFn`, `round1`, `round2`, `chf`, `fmtThousands`, `formatQuadraticTerm`, `shapeSVG`, `coordinateGridSVG` …), statt neue zu schreiben.

## 3. Generator schreiben

Neben die verwandten Generatoren setzen, mit Kommentar `// M3 7b: Kurzbeschreibung`.

```js
function generateBeispiel() {
  const a = rnd(2, 9), b = rndNonZero(-10, 10);
  const correct = a * b;                       // immer BERECHNEN, nie hart eintragen
  return {
    visual: null,
    prompt: `Berechne: ${a} · (${b}) =`,
    answerType: "number",
    correct,
    solution: `${a} · (${b}) = ${correct}`      // konkreter Lösungsweg mit den echten Zahlen, Zeilen mit \n
  };
}
```

Pflichtpunkte:
- **Korrektheit:** `correct` aus denselben Variablen berechnen, die im `prompt` stehen. Rundung im Prompt nennen («auf 2 Dezimalen runden») und `correct` genau so runden.
- **Grenzfälle ausschliessen:** Nenner 0, triviale Aufgaben (×1, +0), negative Ergebnisse, wo sie nicht passen, Lösungen ausserhalb des Stufenniveaus. Mit `do { … } while (…)` neu würfeln.
- **Abwechslung:** genug Zufallsbereich, bei Textaufgaben mehrere Varianten (`const t = rnd(0, 2)`). Alltagskontexte aus der Schweiz (Fr., Gipfeli, SBB, Franken mit `chf`).
- **Schreibweise:** Dezimalpunkt, `−` (U+2212) als Minus in angezeigtem Text, `·` als Malpunkt, `ä/ö/ü` und `ss` statt `ß`. Negative Zahlen in Rechnungen klammern: `(−3)`.
- **`answerType`:**
  - `number`: Zahl. `answerTolerance` erlaubt nur Rundungsunterschiede in der letzten Stelle.
  - `pair` + `pairStyle` (`fraction` → `[zähler, nenner]` vollständig gekürzt; `coordinate` → `[x, y]`; `scientific` → `[mantisse, exponent]`).
  - `mc`: `options` = 4 verschiedene Strings, darunter `correct`. Falsche Optionen = typische Fehler (Vorzeichen, falsche Regel), keine Zufallszahlen. Mit `[...new Set()]` Doppelte entfernen und mischen.
  - `boolean`: `correct` 1 = wahr/ja, 0 = falsch/nein.
  - `hotspot`: Tippen auf SVG mit `target` + `tolerance` bzw. `targetLine` + `lineTolerance`. Vorbild suchen: `grep -n 'answerType: "hotspot"'`.
- **SVG (`visual`)**: `viewBox="0 0 200 200"`, Klasse `mt-shape`, Farben wie bestehende Figuren. Beschriftungen gut lesbar (≥ 11 px bei 200er-viewBox).

## 4. Im Katalog eintragen

Im passenden Kapitel in `BASISWISSEN_` / `JAHR1_` / `JAHR2_` / `JAHR3_CHAPTERS`:
```js
ex("m3-7b-beispiel", "Kurzer Titel", generateBeispiel, "Allgemeiner Hilfetext: wie geht man vor?", true /* nur wenn TR nötig */),
```
- **ID-Schema:** Basiswissen `bw-…`, Jahr 1 `<kapitel>-…` (z. B. `2c-kgv`), Jahr 2 `m2-<kapitel>-…`, Jahr 3 `m3-<kapitel>-…`. Eindeutig, kurz, bestehende IDs nie ändern.
- Titel kurz (Kachel), Hilfetext in Du-Form, 1–2 Sätze, erklärt das Vorgehen und nicht die Lösung.

In `EXERCISE_INFO` ergänzen:
```js
"m3-7b-beispiel": { d: "Was die Übung macht (Du-Form).", g: "Lernziel als Kompetenz formuliert." },
```

Gemischte Übungen, Kampagne und Klassenduell-Suche nehmen neue Übungen automatisch auf. Dort ist nichts zu tun.

## 5. Prüfen

```bash
node .claude/skills/neuer-aufgabentyp/pruefe-aufgaben.js m3-7b-beispiel
```
Danach den ganzen Katalog prüfen (`… pruefe-aufgaben.js` ohne Argument), damit nichts anderes kaputtging. Beide Läufe müssen `0 Problem(e)` melden.

Zusätzlich **selbst rechnen:** 5 erzeugte Aufgaben ausgeben und von Hand nachrechnen, inklusive Lösungsweg-Text:
```bash
node -e '
const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + process.cwd() + "/index.html");
  console.log(await p.evaluate(id => { const e = findExerciseById(id); return Array.from({length: 5}, () => { const t = e.generate(); return t.prompt + "\n→ " + JSON.stringify(t.correct) + "\n" + (t.solution || "") ; }).join("\n\n"); }, "m3-7b-beispiel"));
  await b.close(); })();'
```
Bei `visual` oder `hotspot`: Screenshot in Handygrösse (390×844, deviceScaleFactor 1) von der Übung machen und anschauen.

## 6. Version und Commit

1. `sw.js`: `CACHE_NAME` um 1 erhöhen.
2. `index.html` → `appVersionLabel` auf `vJJJJ-MM-TT.N` setzen.
3. Commit im Repo-Stil, z. B.:
   ```
   Gleichungssysteme in Textaufgaben (M3 7b), 3 neue Aufgabentypen (v2026-11-06.1)

   - m3-7b-…: … (warum / was geübt wird)
   ```
4. Nur auf den vorgegebenen Branch pushen.

## 7. Rückmeldung an die Lehrperson

Kurz auflisten: neue Übungen (Titel, Kapitel, ID), Beispielaufgabe mit Lösung, getroffene Annahmen (Zahlenbereich, TR ja/nein) und das Prüfergebnis. Auf Stellen hinweisen, die fachlich nochmals angeschaut werden sollten.
