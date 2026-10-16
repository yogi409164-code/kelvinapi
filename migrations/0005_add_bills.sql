-- Persist bills linked to dining tables.
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    order_no INTEGER NOT NULL,
    type TEXT NOT NULL,
    table_id INTEGER,
    table_name TEXT,
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_name TEXT NOT NULL DEFAULT '',
    payment TEXT NOT NULL DEFAULT 'unpaid',
    status TEXT NOT NULL DEFAULT 'saved',
    lines_json TEXT NOT NULL DEFAULT '[]',
    discount REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
