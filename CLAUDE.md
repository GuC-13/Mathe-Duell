# Mathe-Duell

Mathe-Trainings-App für Schülerinnen und Schüler der Sekundarstufe (Lehrmittel-Kapitel M1–M3, Bezug zum Lehrplan 21, siehe Ansicht `lp21`).
Einzeldatei-PWA, veröffentlicht über GitHub Pages: https://guc-13.github.io/Mathe-Duell/
Sprache der App, der Kommentare und der Commits: **Deutsch (Schweizer Schreibweise, kein ß)**.

## Aufbau

- `index.html` (~10'000 Zeilen): HTML, CSS und das ganze JavaScript in einer Datei. Kein Build-Schritt, kein Framework, keine Abhängigkeiten.
- `sw.js`: Service Worker. Zuerst Netz, offline aus dem Cache. Fremde Adressen (Firebase) bleiben unangetastet.
- Firebase/Firestore wird nur für das **Klassenduell** (Echtzeit-Spiel mit Raum-PIN) nachgeladen.
- Die Datei ist gross. **Nie ganz einlesen**, sondern mit `grep -n` die Stelle suchen und nur diesen Bereich lesen.

### Wichtige Stellen in `index.html` (mit `grep -n` suchen, Zeilennummern ändern sich)

| Was | Suchbegriff |
|---|---|
| Hilfsfunktionen (`rnd`, `rndNonZero`, `gcdFn`, `lcmFn`, `round1`, `round2`, `chf`, `fmtThousands` …) | `function rnd(` |
| Aufgaben-Generatoren | `function generate…` |
| Beschreibung + Lernziel pro Übung | `const EXERCISE_INFO` |
| Übungskatalog (`ex(id, titel, generator, hilfe, tr)`) | `const BASISWISSEN_CHAPTERS`, `JAHR1_`, `JAHR2_`, `JAHR3_CHAPTERS` |
| Kategorien / Kampagne | `const CATEGORIES`, `const KAMPAGNE_STAGES` |
| Antwortprüfung | `function checkAnswer`, `function answerTolerance` |
| Lösungsweg-Anzeige | `task.solution` |
| Klassenduell | `KLASSEN_`, `function klassen…` |
| Versionsanzeige | `appVersionLabel` |

### Aufgaben-Objekt (Rückgabe eines Generators)

```js
{ visual: null | "<svg …>", prompt: "…", answerType: "number", correct: 42, solution: "Schritt 1\nSchritt 2" }
```
`answerType`: `number` (Standard), `pair` (mit `pairStyle`: `fraction` | `coordinate` | `scientific` | `linear`, `correct: [a, b]`), `mc` (`options` mit 4 Einträgen, `correct` ist einer davon), `boolean` (`correct` 0/1), `hotspot` (Tippen auf SVG), `term`, `factors`, `text`.
Für Neues den Skill `/neuer-aufgabentyp` verwenden.

## Regeln

### Version bei jeder Änderung erhöhen
1. `sw.js`: `CACHE_NAME = "mathe-duell-cache-vNN"` bei **jedem Commit, der `index.html` ändert**, um 1 erhöhen. Sonst sehen Geräte die alte Version.
2. `index.html` → `appVersionLabel`: Format `vJJJJ-MM-TT.N` (heutiges Datum, `N` = Zähler am selben Tag, beginnt bei 1). Bei jedem Release anpassen.

### Commits
- Deutsch. Titel = Liste der Änderungen, durch Kommas getrennt, Version in Klammern am Schluss, z. B.
  `Runden von Dezimalzahlen, Pythagoras gemischt (v2026-11-02.1)`
- Bei mehreren Änderungen darunter eine Liste mit `- …` und dem Grund für jede Änderung.
- Durchgänge mit dem Skill «Schleifstein» heissen `Schleifstein N: …`.

### Fachlich und didaktisch
- **Jede Aufgabe muss mathematisch korrekt sein.** Die richtige Antwort wird berechnet, nie von Hand eingetragen. Grenzfälle prüfen: 0, negative Zahlen, Division durch 0, Rundung (3.97 → 4.0), doppelte MC-Optionen.
- Dezimaltrennzeichen ist der **Punkt** (Schweizer Schulpraxis). Tausender mit `'` über `fmtThousands`, Franken über `chf`.
- Typografisches Minus `−` (U+2212) in Texten für die Anzeige. Malpunkt `·`, nicht `*`.
- Ist ein Taschenrechner nötig, das 5. Argument von `ex()` auf `true` setzen (Abzeichen «TR erlaubt»).
- Jede Übung braucht: Hilfetext (`ex`, 4. Argument), möglichst einen konkreten `solution`-Lösungsweg und einen Eintrag in `EXERCISE_INFO` (`d` = Beschreibung, `g` = Lernziel).
- Bestehende Übungs-IDs nie ändern. Fortschritt (`md_progress_v1`) und Kampagne hängen daran.

### Gestaltung und Barrierefreiheit
- Tippflächen ≥ 44 px, Kontraste nach WCAG AA, Zoom nicht sperren.
- Farben über CSS-Variablen (`var(--accent)` …), damit Hell- und Dunkelmodus funktionieren.
- Keine externen Schriften oder Bibliotheken (offline-fähig, Datenschutz). Schriften sind eingebettet.
- Muss auf dem Handy im Hochformat funktionieren. Das Duell zu zweit sperrt das Querformat (`checkDuellOrientation`).

### Datenschutz (Schülerinnen und Schüler, revDSG)
- Im Klassenduell nur selbst gewählte Spielnamen, keine echten Personendaten verlangen oder speichern.
- Klassenduell-Daten werden nach Spielende in Firestore gelöscht. Dieses Verhalten nicht entfernen.
- Keine Tracking- oder Analysedienste einbauen. `localStorage` nur für Fortschritt, Theme und Sitzung.
- Firebase-Konfiguration in `index.html` ist öffentlich (normal bei Web-Apps). Die Sicherheit liegt in den Firestore-Regeln.

## Prüfen vor dem Commit

```bash
node .claude/skills/neuer-aufgabentyp/pruefe-aufgaben.js
```
Erzeugt pro Übung 300 Aufgaben in der echten App (Playwright/Chromium). Meldet Abstürze, `NaN`/`undefined`, richtige Antworten, die `checkAnswer` nicht erkennt, fehlende Hilfe oder Infos und zu wenig Abwechslung. Mit IDs als Argument werden nur diese Übungen geprüft.
Bei Änderungen an der Oberfläche zusätzlich die App im Browser öffnen und einen Screenshot in Handygrösse (z. B. 390×844) anschauen.
