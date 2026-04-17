const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'speed.db');
let db;

function init() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) return reject(err);
            console.log('Connected to SQLite database.');
            
            db.serialize(() => {
                db.run(`CREATE TABLE IF NOT EXISTS passages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    active INTEGER DEFAULT 0
                )`);

                db.run(`CREATE TABLE IF NOT EXISTS results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    regNumber TEXT NOT NULL,
                    wpm INTEGER NOT NULL,
                    accuracy REAL NOT NULL,
                    errors INTEGER NOT NULL,
                    timeTaken INTEGER NOT NULL,
                    date TEXT DEFAULT CURRENT_TIMESTAMP
                )`);
                
                // Seed data if empty
                db.get(`SELECT COUNT(*) as count FROM passages`, (err, row) => {
                    if (row && row.count === 0) {
                        const defaultText = "The quick brown fox jumps over the lazy dog. This is a simple typing test to see how fast you can type. Practice makes perfect, so keep typing to improve your speed and accuracy.";
                        db.run(`INSERT INTO passages (text, active) VALUES (?, 1)`, [defaultText]);
                    }
                });

                resolve();
            });
        });
    });
}

function getAllPassages() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM passages`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getActivePassage() {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM passages WHERE active = 1 LIMIT 1`, [], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function addPassage(text, active = 0) {
    return new Promise((resolve, reject) => {
        const setActive = active ? 1 : 0;
        if (setActive) {
            db.run(`UPDATE passages SET active = 0`, () => {
                insert();
            });
        } else {
            insert();
        }

        function insert() {
            db.run(`INSERT INTO passages (text, active) VALUES (?, ?)`, [text, setActive], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        }
    });
}

function deletePassage(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM passages WHERE id = ?`, [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

function setActivePassage(id) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`UPDATE passages SET active = 0`, (err) => {
                if (err) return reject(err);
                db.run(`UPDATE passages SET active = 1 WHERE id = ?`, [id], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });
        });
    });
}

function addResult(name, regNumber, wpm, accuracy, errors, timeTaken) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO results (name, regNumber, wpm, accuracy, errors, timeTaken) VALUES (?, ?, ?, ?, ?, ?)`, 
        [name, regNumber, wpm, accuracy, errors, timeTaken], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getAllResults() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM results ORDER BY wpm DESC, accuracy DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function resetResults() {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM results`, [], function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

module.exports = {
    init,
    getAllPassages,
    getActivePassage,
    addPassage,
    deletePassage,
    setActivePassage,
    addResult,
    getAllResults,
    resetResults
};
