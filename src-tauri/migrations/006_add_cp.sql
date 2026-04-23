-- Migration 006 : tag Chef de projet sur article + pourcentage CP par devis

ALTER TABLE catalogue_articles ADD COLUMN is_default_cp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE devis              ADD COLUMN cp_pourcentage REAL    NOT NULL DEFAULT 20;
