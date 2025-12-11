-- Insert Opname Stok ke jenis_stok_masuk dan jenis_stok_keluar
INSERT INTO jenis_stok_masuk (name) 
VALUES ('Opname Stok') 
ON CONFLICT DO NOTHING;

INSERT INTO jenis_stok_keluar (name, tujuan_category) 
VALUES ('Opname Stok', 'SAJ_PUSAT') 
ON CONFLICT DO NOTHING;