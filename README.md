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
- Der kompakte Spieltisch zeigt Bank, Konten, Rundenstatus und direkt auswählbare Meilensteine. Noch keine Verkaufseingaben auf dieser Ansicht.
- **Verkaufsrunde öffnen** startet eine getrennte Ansicht mit vier festen Schritten: Häuser → Bedienungen & CFO → Löhne → Gesamtübersicht.
- Pro Haus den liefernden Spieler auswählen, verkaufte Burger, Pizza, Bier (braun), Limonade (gelb) und Softdrinks (rot) erfassen und „Ohne Garten“ oder „Mit Garten“ wählen. Eine Hausnummer oder Bezeichnung ist optional. „Haus übernehmen & nächstes“ fügt den Verkauf hinzu und öffnet eine leere Eingabe für das nächste Haus.
- Der Stückpreis je Haus (vor dem −1-$-Meilenstein) ist anpassbar, Standard 10 $. Ein Garten verdoppelt nur diesen Stückpreis, nicht die Meilensteinboni. Mitarbeiter werden nicht verwaltet.
- Nach den Häusern Bedienungen und CFO je Spieler erfassen. Der CFO ist durch den entsprechenden Meilenstein automatisch aktiv. Der 50-%-Bonus zählt einmal auf sämtliche Rundeneinnahmen einschließlich Trinkgeld und wird aufgerundet.
- Im dritten Schritt die tatsächliche Anzahl bezahlter Mitarbeiter eingeben (5 $ je Person). Rabatte werden von den Spielern vorher berücksichtigt. Eine laufende Rechnung zeigt bisherigen Stand, Einnahmen, Lohnausgaben und neuen Stand. Ungedeckte Lohnzahlungen sind nicht zulässig.
- In der Gesamtübersicht lassen sich einzelne Hausverkäufe bearbeiten, entfernen oder ergänzen; Bedienungen, CFO und Löhne bleiben über eigene Buttons erreichbar. Neben der Aufschlüsselung erscheinen die Spalten Einnahmen, Ausgaben/Löhne und neuer Kontostand pro Spieler. Erst „Runde bestätigen“ bucht Verkäufe und Löhne gemeinsam und kehrt zum Spieltisch zurück. Löhne fließen zurück in die Bank.
- Reicht die Bank für die Verkäufe nicht aus, werden im Lohnschritt die Reservekarten pro Spieler mit 100/200/300 $ abgefragt. Die Reserve wird zunächst für die Vorschau verwendet und erst mit der Runde gebucht. Bankbrüche werden vor den Lohnrückzahlungen geprüft; CEO-Slots verbleiben am physischen Tisch.
- Beim zweiten Bankbruch werden sämtliche Verkaufseinnahmen ausgezahlt. Die Partie endet vor der Lohnphase. Gleichstände löst die physische Spielreihenfolge auf.
- Den 100-$-Meilenstein manuell erst in der Folgerunde aktivieren; die App vergibt Meilensteine nicht selbst. Mehrere Spieler können denselben Meilenstein erhalten.

## Korrekturen und Speicherung

Das Protokoll speichert die Eingaben einschließlich Stückpreis, Meilensteinen und CFO der jeweiligen Runde. Korrekturen berechnen Bank und sämtliche Kontostände neu. Spätere Meilensteinänderungen verändern keine älteren Buchungen. Historische Meilensteinkorrekturen ändern nur den bearbeiteten Verkauf; spätere Verkäufe müssen bei Bedarf ebenfalls korrigiert werden. Änderungen, die ungedeckte Löhne oder Buchungen nach einem vorgezogenen Spielende verursachen, werden abgewiesen. Dazu spätere Buchungen vom Ende her zurücknehmen und neu erfassen.

Neue Buchungen enthalten sämtliche Hausverkäufe, die im Protokoll pro Spieler aufklappbar sind. Vorhandene Spielstände bleiben kompatibel: Alte Buchungen ohne Hausdaten werden weiterhin als Summeneingaben bearbeitet. Hausreihenfolge, aktuelle Eingabe und Fortschritt im Verkaufsassistenten werden auch beim Verlassen oder Neuladen erhalten.

Neue Runden werden gemeinsam bestätigt und zurückgenommen; Verkauf und Lohn bleiben als getrennte, nachvollziehbare Protokolleinträge erhalten. Beim Bearbeiten eines modernen Verkaufs- oder Lohneintrags öffnet sich die gesamte Rundenabrechnung. Die Vorschau zeigt den Kontostand am Ende der bearbeiteten Runde; spätere Runden werden beim Speichern ebenfalls neu berechnet. Bei älteren Partien mit bereits gebuchten Hausverkäufen und noch offenen Löhnen setzt der Assistent im Lohnschritt fort, ohne die Verkäufe doppelt gutzuschreiben.

Eingaben der laufenden Runde werden automatisch lokal gespeichert. Export/Import als JSON ermöglicht Backups und manuellen Gerätewechsel. Beim Import wird die bisherige Partie nach Bestätigung ersetzt. Nur eine Partie liegt gleichzeitig im lokalen Speicher; vor einer neuen Partie exportieren.

Nach Anzeige „Offline bereit“ ist die komplette App lokal gecacht. Offline-Betrieb funktioniert auf demselben Browser und Gerät, solange Cache und Website-Daten erhalten bleiben. Private Browserfenster sind nicht für dauerhafte Speicherung geeignet. Ein neues App-Release muss `CACHE` in `sw.js` erhöhen; nach vollständigem Download wird der neue Cache aktiviert. Geöffnete Seiten zeigen beim nächsten Neuladen die neue Version. Spielstände liegen getrennt vom App-Cache und bleiben bei Updates erhalten. Falls noch eine ältere Ansicht erscheint, nach einigen Sekunden erneut laden; keine Website-Daten löschen.

Gleichzeitige Synchronisierung mehrerer Geräte ist noch nicht implementiert. Dafür wäre z. B. ein separater WebSocket- oder Datenbankdienst nötig; GitHub Pages selbst dient nur statische Dateien aus. Der lokale Betrieb benötigt diesen Dienst nicht.

Regelgrundlage: [Food Chain Magnate, englisches Grundspiel-Regelheft](https://splottercon.com/wp-content/uploads/2023/07/FCM_Rules_EN_v3.pdf). Unabhängiges Fanprojekt; keine offiziellen Spielgrafiken enthalten.
