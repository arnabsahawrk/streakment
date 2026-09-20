import postgres from "postgres";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

const sql =
  global.__sql ??
  postgres(process.env.DATABASE_URL ?? "", { ssl: "require", max: 1 });

global.__sql = sql;
export default sql;
