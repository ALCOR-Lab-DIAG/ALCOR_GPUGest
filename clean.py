import sqlite3

# 1. Connessione al DB
conn = sqlite3.connect("gpu_reservations.db")
cur = conn.cursor()

# 2. Verifica (stampa quante righe verrebbero eliminate)
cur.execute("SELECT COUNT(*) FROM users")
print(f"Righe da eliminare: {cur.fetchone()[0]}")

# 3. Cancellazione
cur.execute("DELETE FROM users")

cur.execute("SELECT COUNT(*) FROM reservations")
print(f"Righe da eliminare: {cur.fetchone()[0]}")

# 3. Cancellazione
cur.execute("DELETE FROM reservations")

# 4. Commit & chiusura
conn.commit()
conn.close()