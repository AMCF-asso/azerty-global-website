-- Demandes "Previens-moi" (autocollants et claviers AZERTY Global).
-- Une ligne par adresse e-mail. Dates en ISO 8601 UTC.
-- Chaque instruction se termine par un point-virgule en fin de ligne.
CREATE TABLE demandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  pays TEXT NOT NULL,
  autocollants INTEGER NOT NULL DEFAULT 0 CHECK (autocollants IN (0, 1)),
  clavier INTEGER NOT NULL DEFAULT 0 CHECK (clavier IN (0, 1)),
  couleur_touches TEXT,
  disposition_physique TEXT,
  type_clavier TEXT,
  prix_autocollants TEXT,
  prix_clavier TEXT,
  profil TEXT,
  organisation TEXT,
  postes INTEGER,
  page_origine TEXT,
  cree_le TEXT NOT NULL,
  maj_le TEXT NOT NULL,
  jeton TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_demandes_jeton ON demandes (jeton);
CREATE INDEX idx_demandes_cree_le ON demandes (cree_le);
