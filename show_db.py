#!/usr/bin/env python3
import sqlite3
import sys

def main(db_path):
    # apri la connessione
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # prendi la lista delle tabelle
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]
    if not tables:
        print("Nessuna tabella trovata in", db_path)
        return

    for table in tables:
        print(f"\n=== Tabella: {table} ===")
        # schema colonna
        cursor.execute(f"PRAGMA table_info({table});")
        cols = cursor.fetchall()
        col_names = [c[1] for c in cols]
        print("Colonne:", ", ".join(col_names))

        # anteprima dei dati (modifica LIMIT se vuoi più righe)
        cursor.execute(f"SELECT * FROM {table} LIMIT 20;")
        rows = cursor.fetchall()
        if rows:
            # stampa a colonne allineate
            widths = [ max(len(str(val)) for val in ([name] + [r[i] for r in rows])) for i,name in enumerate(col_names) ]
            # header
            hdr = " | ".join(name.ljust(widths[i]) for i,name in enumerate(col_names))
            print(hdr)
            print("-" * len(hdr))
            for r in rows:
                print(" | ".join(str(val).ljust(widths[i]) for i,val in enumerate(r)))
        else:
            print("(tabella vuota)")

    conn.close()

if __name__ == "__main__":
    main("./gpu_reservations.db")
