# GameScores

Eine kleine deutsche Webanwendung für Brettspiel-Abrechnungen, zunächst Food Chain Magnate (Grundspiel, 2–5 Spieler). Ohne Backend, Konto, externe Schriftarten oder Laufzeitabhängigkeiten. Alle Buchungen und Eingaben bleiben auf dem gemeinsamen Gerät.

## Lokal starten

Node.js 24 oder neuer:

```sh
npm start
```

Dann http://127.0.0.1:4173 öffnen. Keine Installation erforderlich. Für Service Worker muss die Seite über localhost oder HTTPS geladen werden; direktes Öffnen als Datei reicht nicht.

Falls PowerShell `npm.ps1` aufgrund der Ausführungsrichtlinie blockiert, stattdessen `npm.cmd start` beziehungsweise `npm.cmd test` verwenden.

```sh
npm test
```

## GitHub Pages

1. Dateien in ein GitHub-Repository auf den Branch `main` pushen.
2. Unter **Settings → Pages → Build and deployment → Source** die Option **GitHub Actions** wählen.
3. Den Workflow „Deploy GameScores to GitHub Pages“ bei Bedarf unter Actions manuell starten.

Die Anwendung verwendet relative Pfade und funktioniert auch unter `https://name.github.io/repository/`. Der Workflow prüft zuerst die Abrechnungslogik und veröffentlicht ausschließlich die sieben statischen Anwendungsdateien plus `.nojekyll`.

Repository: https://github.com/jukrauss/GameScore · GitHub Pages: https://jukrauss.github.io/GameScore/

## Spielablauf

- Spielauswahl → Setup mit Namen und eindeutigen Farben. Konten starten bei 0 $, die Bank bei 50 $ pro Spieler.
- Verkäufe: Burger, Pizza, Bier (braun), Limonade (gelb), Softdrinks (rot), Bedienungen und CFO. Verkaufsrelevante Meilensteine separat aktivieren; diese werden für spätere Runden übernommen.
- Optionaler Stückpreis (vor dem −1-$-Meilenstein) für Preismanager, Discount Manager und Luxusmanager. Standard 10 $. Mitarbeiter werden nicht verwaltet.
- Optional die Gesamtzahl der Waren eingeben, die an Häuser mit Garten verkauft wurden. Diese erhalten einen weiteren Stückpreis, ohne Verdopplung der Meilensteinboni. Keine einzelnen Häuser nötig.
- Übersicht aller Spieler prüfen und die gesamte Verkaufsphase bestätigen. CFO: 50 % auf sämtliche Rundeneinnahmen einschließlich Trinkgeld, aufgerundet, nur einmal.
- Bei erstem Bankbruch Reservekarten pro Spieler mit 100/200/300 $ aufdecken und hinzufügen. Ein bereits ausgezahlter Fehlbetrag wird verrechnet. Die Karten werden nicht vorzeitig abgefragt; CEO-Slots verbleiben am physischen Tisch.
- Danach tatsächliche Anzahl bezahlter Mitarbeiter eingeben (5 $ je Person), Vorschau prüfen und bestätigen. Rabatte werden von den Spielern vorher berücksichtigt. Löhne fließen zurück in die Bank. Ungedeckte Lohnzahlungen sind nicht zulässig.
- Beim zweiten Bankbruch werden sämtliche Verkaufseinnahmen ausgezahlt. Die Partie endet vor der Lohnphase. Gleichstände löst die physische Spielreihenfolge auf.
- Den 100-$-Meilenstein manuell erst in der Folgerunde aktivieren; die App vergibt Meilensteine nicht selbst. Mehrere Spieler können denselben Meilenstein erhalten.

## Korrekturen und Speicherung

Das Protokoll speichert die Eingaben einschließlich Stückpreis, Meilensteinen und CFO der jeweiligen Runde. Korrekturen berechnen Bank und sämtliche Kontostände neu. Spätere Meilensteinänderungen verändern keine älteren Buchungen. Historische Meilensteinkorrekturen ändern nur den bearbeiteten Verkauf; spätere Verkäufe müssen bei Bedarf ebenfalls korrigiert werden. Änderungen, die ungedeckte Löhne oder Buchungen nach einem vorgezogenen Spielende verursachen, werden abgewiesen. Dazu spätere Buchungen vom Ende her zurücknehmen und neu erfassen.

Eingaben der laufenden Runde werden automatisch lokal gespeichert. Export/Import als JSON ermöglicht Backups und manuellen Gerätewechsel. Beim Import wird die bisherige Partie nach Bestätigung ersetzt. Nur eine Partie liegt gleichzeitig im lokalen Speicher; vor einer neuen Partie exportieren.

Nach Anzeige „Offline bereit“ ist die komplette App lokal gecacht. Offline-Betrieb funktioniert auf demselben Browser und Gerät, solange Cache und Website-Daten erhalten bleiben. Private Browserfenster sind nicht für dauerhafte Speicherung geeignet. Ein neues App-Release muss `CACHE` in `sw.js` erhöhen; die neue Version aktiviert sich, sobald die bisherigen Tabs geschlossen sind. Spielstände liegen getrennt vom App-Cache und bleiben bei Updates erhalten.

Gleichzeitige Synchronisierung mehrerer Geräte ist noch nicht implementiert. Dafür wäre z. B. ein separater WebSocket- oder Datenbankdienst nötig; GitHub Pages selbst dient nur statische Dateien aus. Der lokale Betrieb benötigt diesen Dienst nicht.

Regelgrundlage: [Food Chain Magnate, englisches Grundspiel-Regelheft](https://splottercon.com/wp-content/uploads/2023/07/FCM_Rules_EN_v3.pdf). Unabhängiges Fanprojekt; keine offiziellen Spielgrafiken enthalten.
