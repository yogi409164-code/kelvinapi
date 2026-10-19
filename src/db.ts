export function primaryDb(db: D1Database) {
	return typeof db.withSession === "function" ? db.withSession("first-primary") : db;
}
