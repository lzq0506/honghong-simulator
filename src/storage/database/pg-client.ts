import { Pool, QueryResultRow } from "pg";

// dev 热更新会重复加载模块，Pool 挂到 globalThis 上避免连接池越建越多
const globalForPg = globalThis as unknown as { pgPool?: Pool };

function getPgPool(): Pool {
  if (!globalForPg.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL 未配置，请在 .env.local 中设置");
    }
    globalForPg.pgPool = new Pool({ connectionString, max: 10 });
  }
  return globalForPg.pgPool;
}

/** 执行参数化 SQL，返回行数组；出错直接抛异常，由调用方 catch */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPgPool().query<T>(text, params);
  return result.rows;
}
