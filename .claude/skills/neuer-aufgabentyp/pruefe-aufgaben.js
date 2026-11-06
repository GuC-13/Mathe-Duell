// Prüft Aufgabentypen in der echten App: lädt index.html im Browser und
// erzeugt pro Übung viele Aufgaben. Meldet Abstürze, NaN/undefined, falsche
// Antwortformen, fehlende Hilfe/Infos und ob die richtige Antwort von
// checkAnswer() als richtig erkannt wird.
//
// Aufruf (im Repo-Ordner):
//   node .claude/skills/neuer-aufgabentyp/pruefe-aufgaben.js            -> alle Übungen
//   node .claude/skills/neuer-aufgabentyp/pruefe-aufgaben.js m3-7a-ungl 2c-kgv
// Optional: RUNS=500 node ... (Standard 300 Aufgaben pro Übung)
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const ids = process.argv.slice(2);
  const runs = Number(process.env.RUNS) || 300;
  const file = "file://" + path.resolve(__dirname, "../../../index.html");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(String(e)));
  await page.goto(file);
  const result = await page.evaluate(({ ids, runs }) => {
    const all = [];
    CATEGORIES.forEach(cat => cat.chapters.forEach(ch => ch.exercises.forEach(e => all.push({ cat: cat.id, ch: ch.id, e }))));
    const seen = new Map();
    const dupIds = [];
    all.forEach(x => { if (seen.has(x.e.id)) dupIds.push(x.e.id); seen.set(x.e.id, x); });
    const missing = ids.filter(id => !seen.has(id));
    const targets = ids.length ? all.filter(x => ids.includes(x.e.id)) : all;
    const problems = [];
    const report = (x, msg) => problems.push(`${x.e.id} (${x.cat}/${x.ch}): ${msg}`);
    const bad = v => v === undefined || v === null || (typeof v === "number" && !isFinite(v));
    const asInput = t => {
      if (t.answerType === "pair") return t.correct.join(",");
      if (t.answerType === "factors") return t.correct.join("·");
      if (t.answerType === "hotspot") return null; // braucht Tippkoordinaten - nicht automatisch prüfbar
      return String(t.correct);
    };
    targets.forEach(x => {
      if (!x.e.help) report(x, "kein Hilfetext (4. Argument von ex())");
      if (typeof EXERCISE_INFO !== "undefined" && !EXERCISE_INFO[x.e.id]) report(x, "kein Eintrag in EXERCISE_INFO (Beschreibung d / Lernziel g)");
      const prompts = new Set();
      for (let i = 0; i < runs; i++) {
        let t;
        try { t = x.e.generate(); } catch (err) { report(x, `Absturz: ${err.message}`); break; }
        const txt = JSON.stringify(t);
        if (!t || !t.prompt) { report(x, "kein prompt"); break; }
        if (/NaN|undefined|Infinity/.test(t.prompt + (t.solution || "") + (t.options || []).join("|"))) { report(x, `NaN/undefined im Text: ${t.prompt.slice(0, 80)}`); break; }
        if (t.answerType === "hotspot") {
          if (!t.target && !t.targetLine && !t.targetLines) { report(x, "hotspot ohne target/targetLine(s)"); break; }
        } else if (bad(t.correct) || (Array.isArray(t.correct) && t.correct.some(bad))) { report(x, `ungültige richtige Antwort: ${txt.slice(0, 120)}`); break; }
        if (t.answerType === "mc") {
          if (!Array.isArray(t.options) || t.options.length < 2) { report(x, "mc ohne options"); break; }
          if (!t.options.map(String).includes(String(t.correct))) { report(x, `richtige Antwort fehlt in options: ${t.prompt.slice(0, 60)}`); break; }
          if (new Set(t.options.map(String)).size !== t.options.length) { report(x, `doppelte Antwortoption: ${t.options.join(" | ")}`); break; }
        }
        if (t.answerType === "boolean" && ![0, 1].includes(t.correct)) { report(x, "boolean muss 0 oder 1 sein"); break; }
        if (t.answerType === "pair" && (!Array.isArray(t.correct) || t.correct.length !== 2)) { report(x, "pair braucht correct: [a, b]"); break; }
        const inp = asInput(t);
        if (inp !== null && !checkAnswer(t, inp)) { report(x, `checkAnswer erkennt die eigene richtige Antwort nicht (${inp}): ${t.prompt.slice(0, 60)}`); break; }
        prompts.add(t.prompt + "|" + (t.visual || "") + "|" + (t.options || []).join("|"));
      }
      if (runs >= 50 && prompts.size > 0 && prompts.size < 4) report(x, `nur ${prompts.size} verschiedene Aufgaben in ${runs} Versuchen - zu wenig Abwechslung?`);
    });
    return { checked: targets.length, problems, missing, dupIds };
  }, { ids, runs });
  await browser.close();
  if (result.missing.length) console.log("Nicht gefunden: " + result.missing.join(", "));
  if (result.dupIds.length) console.log("Doppelte IDs: " + result.dupIds.join(", "));
  pageErrors.forEach(e => console.log("Seitenfehler: " + e));
  result.problems.forEach(p => console.log("✗ " + p));
  console.log(`${result.checked} Übung(en) geprüft, ${result.problems.length} Problem(e).`);
  process.exit(result.problems.length || result.missing.length || result.dupIds.length || pageErrors.length ? 1 : 0);
})();
