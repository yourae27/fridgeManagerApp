import * as SQLite from 'expo-sqlite';
import { getLocales } from 'expo-localization';

const DB_NAME = 'ninecents.db';

// 创建一个单例数据库连接
let dbInstance: SQLite.SQLiteDatabase | null = null;

const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    }
    return dbInstance;
};

const getDBSync = () => {
    if (!dbInstance) {
        dbInstance = SQLite.openDatabaseSync(DB_NAME);
    }
    return dbInstance;
};

export const initDatabase = () => {
    const db = getDBSync();
    try {
        // 获取设备语言
        const locales = getLocales();
        const languageCode = locales[0].languageTag.split('-')[0];

        // 根据语言设置默认成员名称
        const defaultMemberName = languageCode === 'zh' ? '我' : 'me';

        // 创建表结构
        db.execSync(`

            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                budget REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                date TEXT NOT NULL,
                member_id INTEGER NOT NULL DEFAULT 1,
                refunded BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(member_id) REFERENCES members(id)
            );
            
            CREATE TABLE IF NOT EXISTS transaction_tags (
                transaction_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY(transaction_id, tag_id)
            );

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS income_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                sort_order INTEGER DEFAULT 0,
                member_id INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expense_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                sort_order INTEGER DEFAULT 0,
                member_id INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 检查是否已存在默认成员
        const existingMember = db.getAllSync(
            'SELECT * FROM members WHERE id = 1;'
        );

        // 如果不存在默认成员，则添加
        if (existingMember.length === 0) {
            db.runSync(
                'INSERT INTO members (id, name) VALUES (1, ?);',
                [defaultMemberName]
            );
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

export const addTransaction = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    categoryIcon: string;
    note?: string;
    date: string;
    member_id?: number;
    refunded?: boolean;
    tags?: number[];
}) => {
    const db = await getDB();
    await db.withTransactionAsync(async () => {
        const result = await db.runAsync(
            'INSERT INTO transactions (type, amount, category, categoryIcon, note, date, member_id, refunded) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            [
                data.type,
                data.amount,
                data.category,
                data.categoryIcon,
                data.note || '',
                data.date,
                data.member_id || 0,
                data.refunded || false
            ]
        );

        if (data.tags?.length) {
            const transactionId = result.lastInsertRowId;
            data.tags.forEach(async (tagId) => {
                await db.runAsync(`
                INSERT INTO transaction_tags (transaction_id, tag_id)
                VALUES (${transactionId}, ${tagId});
            `);
            })
        }
    });
};

export const addFavorite = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    categoryIcon: string;
    note?: string;
    member_id: number;
}) => {
    const db = await getDB();
    const tableName = data.type === 'income' ? 'income_favorites' : 'expense_favorites';
    const statement = await db.prepareAsync(`
        INSERT INTO ${tableName} (amount, category, categoryIcon, note, member_id)
        VALUES (?, ?, ?, ?, ?);
    `);
    try {
        return await statement.executeAsync([
            data.amount,
            data.category,
            data.categoryIcon,
            data.note || '',
            data.member_id || 1
        ]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const getFavorites = async (type: 'income' | 'expense') => {
    const db = await getDB();
    const tableName = type === 'income' ? 'income_favorites' : 'expense_favorites';
    return await db.getAllAsync<{
        id: number;
        amount: number;
        category: string;
        categoryIcon: string;
        note: string;
        sort_order: number;
        member_id: number;
    }>(`SELECT id, amount, category, categoryIcon, note, sort_order, member_id 
        FROM ${tableName} 
        ORDER BY sort_order ASC, id DESC;`);
};

export const getTransactions = async (options?: {
    page?: number;
    pageSize?: number;
    filter?: string;
    memberIds?: number[];
    searchText?: string;
}) => {
    const db = await getDB();
    const {
        page = 1,
        pageSize = 10,
        filter = 'all',
        memberIds = [],
        searchText = ''
    } = options || {};

    try {
        // 构建查询条件
        let whereClause = '';
        const whereParams: any[] = [];

        // 根据过滤条件筛选
        if (filter === 'income') {
            whereClause += 'WHERE t.type = ?';
            whereParams.push('income');
        } else if (filter === 'expense') {
            whereClause += 'WHERE t.type = ?';
            whereParams.push('expense');
        } else {
            whereClause += 'WHERE 1=1';
        }

        // 根据成员ID筛选
        if (memberIds.length > 0) {
            whereClause += ' AND t.member_id IN (' + memberIds.map(() => '?').join(',') + ')';
            whereParams.push(...memberIds);
        }

        // 根据搜索文本筛选
        if (searchText) {
            whereClause += ' AND (t.note LIKE ? OR t.category LIKE ? OR m.name LIKE ?)';
            const searchPattern = `%${searchText}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern);
        }

        // 获取总记录数
        const countResult = await db.getAllAsync<{ total: number }>(
            `SELECT COUNT(*) as total FROM transactions t
             LEFT JOIN members m ON t.member_id = m.id
             ${whereClause}`,
            whereParams
        );
        const total = countResult[0].total;

        // 构建分页查询
        let limitClause = '';
        if (page > 0 && pageSize > 0) {
            // 正常分页
            const offset = (page - 1) * pageSize;
            limitClause = `LIMIT ${pageSize} OFFSET ${offset}`;
        }
        // 如果 page 或 pageSize 为负数，则不添加 LIMIT 子句，返回所有记录

        // 获取交易记录
        const transactions: any = await db.getAllAsync(
            `SELECT t.*, m.name as member FROM transactions t
             LEFT JOIN members m ON t.member_id = m.id
             ${whereClause}
             ORDER BY t.date DESC, t.id DESC
             ${limitClause}`,
            whereParams
        );

        // 获取每个交易的标签
        for (const transaction of transactions) {
            const tags = await db.getAllAsync(
                `SELECT tag_id FROM transaction_tags WHERE transaction_id = ?`,
                [transaction?.id]
            );
            transaction.tags = tags.map((t: any) => t.tag_id);
        }

        return {
            transactions,
            total,
            page,
            pageSize,
            hasMore: pageSize > 0 ? Math.ceil(total / pageSize) > page : false,
            totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 1
        };
    } catch (error) {
        console.error('Failed to get transactions:', error);
        throw error;
    }
};

export const deleteFavorite = async (type: 'income' | 'expense', id: number) => {
    const db = await getDB();
    const tableName = type === 'income' ? 'income_favorites' : 'expense_favorites';
    const statement = await db.prepareAsync(`DELETE FROM ${tableName} WHERE id = ?;`);
    try {
        return await statement.executeAsync([id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const deleteTransaction = async (id: number) => {
    const db = await getDB();
    const statement = await db.prepareAsync('DELETE FROM transactions WHERE id = ?;');
    try {
        return await statement.executeAsync([id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const updateFavorite = async (id: number, data: {
    type?: 'income' | 'expense';
    amount?: number;
    category?: string;
    categoryIcon?: string;
    note?: string;
    member_id?: number;
}) => {
    const db = await getDB();
    const updates = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `${key} = ?`)
        .join(', ');

    const values = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([_, value]) => value);

    const statement = await db.prepareAsync(`
        UPDATE favorites 
        SET ${updates}
        WHERE id = ?;
    `);
    try {
        return await statement.executeAsync([...values, id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const updateTransaction = async (id: number, data: {
    type?: 'income' | 'expense';
    amount?: number;
    category?: string;
    categoryIcon?: string;
    note?: string;
    date?: string;
    member_id?: number | null;
    refunded?: boolean;
    tags?: number[];
}) => {
    const db = await getDB();
    await db.withTransactionAsync(async () => {
        // 处理 member_id 为 null 的情况，将其转换为 0
        const memberIdValue = data.member_id === null ? 0 : (data.member_id || 0);

        // 更新主表数据
        const updates = Object.entries(data)
            .filter(([key, value]) => value !== undefined && key !== 'tags')
            .map(([key, _]) => `${key} = ?`)
            .join(', ');

        const values = Object.entries(data)
            .filter(([key, value]) => value !== undefined && key !== 'tags')
            .map(([_, value]) => value);

        if (updates.length > 0) {
            const statement = await db.prepareAsync(`
                UPDATE transactions 
                SET ${updates}
                WHERE id = ?;
            `);
            try {
                await statement.executeAsync([...values, id] as any);
            } finally {
                await statement.finalizeAsync();
            }
        }

        // 更新标签关联
        if (data.tags !== undefined) {
            // 先删除旧的标签关联
            await db.runAsync('DELETE FROM transaction_tags WHERE transaction_id = ?;', [id]);

            // 添加新的标签关联
            if (data.tags.length > 0) {
                const tagValues = data.tags.map(tagId => `(${id}, ${tagId})`).join(',');
                await db.runAsync(`
                    INSERT INTO transaction_tags (transaction_id, tag_id)
                    VALUES ${tagValues};
                `);
            }
        }
    });
};

export const getCategories = async (type?: 'income' | 'expense') => {
    const db = await getDB();
    const typeFilter = type ? 'WHERE type = ?' : '';
    const params = type ? [type] : [];
    return await db.getAllAsync<{
        id: number;
        type: string;
        name: string;
        icon: string;
        sort_order: number;
    }>(`SELECT * FROM categories ${typeFilter} ORDER BY sort_order ASC, created_at ASC;`, params);
};

export const addCategory = async (data: {
    type: 'income' | 'expense';
    name: string;
    icon: string;
}) => {
    const db = await getDB();
    const statement = await db.prepareAsync(
        'INSERT INTO categories (type, name, icon) VALUES (?, ?, ?);'
    );
    try {
        return await statement.executeAsync([data.type, data.name, data.icon]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const deleteCategory = async (id: number) => {
    const db = await getDB();
    const statement = await db.prepareAsync('DELETE FROM categories WHERE id = ?;');
    try {
        return await statement.executeAsync([id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const getMembers = async () => {
    const db = await getDB();
    return await db.getAllAsync<{
        id: number;
        name: string;
        budget: number | null;
        created_at: string;
    }>('SELECT * FROM members ORDER BY created_at ASC;');
};

export const addMember = async (data: { name: string; budget?: number }) => {
    const db = await getDB();
    const statement = await db.prepareAsync(
        'INSERT INTO members (name, budget) VALUES (?, ?);'
    );
    try {
        return await statement.executeAsync([data.name, data.budget || null]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const updateMember = async (id: number, data: { name?: string; budget?: number | null }) => {
    const db = await getDB();
    const updates = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `${key} = ?`)
        .join(', ');

    const values = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([_, value]) => value);

    const statement = await db.prepareAsync(`
        UPDATE members 
        SET ${updates}
        WHERE id = ?;
    `);
    try {
        return await statement.executeAsync([...values, id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const deleteMember = async (id: number) => {
    const db = await getDB();
    const statement = await db.prepareAsync('DELETE FROM members WHERE id = ?;');
    try {
        return await statement.executeAsync([id]);
    } finally {
        await statement.finalizeAsync();
    }
};

// 标签相关操作
export const getTags = async () => {
    const db = await getDB();
    return await db.getAllAsync<{
        id: number;
        name: string;
        color: string;
        created_at: string;
    }>('SELECT * FROM tags ORDER BY created_at ASC;');
};

export const addTag = async (data: { name: string; color: string }) => {
    const db = await getDB();
    const statement = await db.prepareAsync(
        'INSERT INTO tags (name, color) VALUES (?, ?);'
    );
    try {
        return await statement.executeAsync([data.name, data.color]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const updateTag = async (id: number, data: { name?: string; color?: string }) => {
    const db = await getDB();
    const updates = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => `${key} = ?`)
        .join(', ');

    const values = Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([_, value]) => value);

    const statement = await db.prepareAsync(`
        UPDATE tags 
        SET ${updates}
        WHERE id = ?;
    `);
    try {
        return await statement.executeAsync([...values, id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const deleteTag = async (id: number) => {
    const db = await getDB();
    const statement = await db.prepareAsync('DELETE FROM tags WHERE id = ?;');
    try {
        return await statement.executeAsync([id]);
    } finally {
        await statement.finalizeAsync();
    }
};

// 添加新的统计查询函数
export const getStats = async (
    period: 'month' | 'year' | 'custom',
    type: 'category' | 'member' | 'tag',
    date: Date,
    customRange?: { start: Date; end: Date },
    statMode: 'income' | 'expense' = 'expense'
) => {
    const db = await getDB();
    let dateFilter = '';
    const params: any[] = [];

    if (period === 'month') {
        dateFilter = "strftime('%Y-%m', date) = strftime('%Y-%m', ?)";
        params.push(date.toISOString());
    } else if (period === 'year') {
        dateFilter = "strftime('%Y', date) = strftime('%Y', ?)";
        params.push(date.toISOString());
    } else if (period === 'custom' && customRange) {
        dateFilter = "date BETWEEN ? AND ?";
        params.push(customRange.start.toISOString().split('T')[0]);
        params.push(customRange.end.toISOString().split('T')[0]);
    } else {
        dateFilter = "strftime('%Y-%m', date) = strftime('%Y-%m', ?)";
        params.push(date.toISOString());
    }

    let query = '';

    if (type === 'tag') {
        query = `
      SELECT 
        t.name,
        t.color as color,
        SUM(ABS(tr.amount)) as total_amount
      FROM transactions tr
      JOIN transaction_tags tt ON tr.id = tt.transaction_id
      JOIN tags t ON tt.tag_id = t.id
      WHERE tr.type = ? AND NOT tr.refunded AND ${dateFilter}
      GROUP BY t.id
      ORDER BY total_amount DESC
    `;
        params.unshift(statMode); // 添加到参数数组的开头
    } else {
        const groupField = type === 'category' ? 't.category' : 't.member_id';
        const joinTable = type === 'category' ? 'categories c' : 'members m';
        const joinCondition = type === 'category'
            ? `t.category = c.name AND c.type = ?`
            : 't.member_id = m.id';
        const nameField = type === 'category' ? 'c.name' : 'm.name';
        const iconField = type === 'category' ? 'c.icon' : '"👤"';

        query = `
      SELECT 
        ${nameField} as name,
        ${iconField} as icon,
        SUM(ABS(t.amount)) as total_amount
      FROM transactions t
      LEFT JOIN ${joinTable} ON ${joinCondition}
      WHERE t.type = ? AND NOT t.refunded AND ${dateFilter}
      GROUP BY ${groupField}
      ORDER BY total_amount DESC
    `;

        if (type === 'category') {
            params.unshift(statMode); // 添加类型参数（income 或 expense）
            params.unshift(statMode); // 添加到 joinCondition 的参数
        } else {
            params.unshift(statMode); // 只添加一次类型参数
        }
    }

    const stats = await db.getAllAsync(query, params);

    // 获取月度统计数据
    const monthlyStatsQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' AND NOT refunded THEN ABS(amount) ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' AND NOT refunded THEN ABS(amount) ELSE 0 END) as expense
    FROM transactions
    WHERE ${dateFilter}
  `;

    const [monthlyStats] = await db.getAllAsync(monthlyStatsQuery, params.slice(-params.length + (type === 'category' ? 2 : 1)));

    // 获取上月数据进行同比
    const lastMonthDate = new Date(date);
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

    const lastMonthStatsQuery = `
    SELECT 
      SUM(CASE WHEN type = 'income' AND NOT refunded THEN ABS(amount) ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' AND NOT refunded THEN ABS(amount) ELSE 0 END) as expense
    FROM transactions
    WHERE strftime('%Y-%m', date) = strftime('%Y-%m', ?)
  `;

    const [lastMonthStats] = await db.getAllAsync(lastMonthStatsQuery, [lastMonthDate.toISOString()]);

    // 添加获取日历数据的逻辑
    const dailyStatsQuery = `
      SELECT 
        date,
        SUM(CASE WHEN type = 'income' AND NOT refunded THEN ABS(amount) ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' AND NOT refunded THEN ABS(amount) ELSE 0 END) as expense
      FROM transactions
      WHERE ${dateFilter}
      GROUP BY date
    `;

    const dailyStats = await db.getAllAsync(dailyStatsQuery, params.slice(-params.length + (type === 'category' ? 2 : 1)));
    const dailyStatsMap = dailyStats.reduce((acc: any, curr: any) => {
        acc[curr.date] = {
            income: curr.income || 0,
            expense: curr.expense || 0
        };
        return acc;
    }, {});

    return {
        stats: stats.map((item: any) => ({
            name: item.name,
            amount: item.total_amount,
            icon: item.icon,
            color: item.color
        })),
        monthlyStats: {
            income: (monthlyStats as any).income || 0,
            expense: (monthlyStats as any).expense || 0,
            balance: ((monthlyStats as any).income || 0) - ((monthlyStats as any).expense || 0),
            incomeChange: (lastMonthStats as any).income
                ? (((monthlyStats as any).income - (lastMonthStats as any).income) / (lastMonthStats as any).income) * 100
                : 0,
            expenseChange: (lastMonthStats as any).expense
                ? (((monthlyStats as any).expense - (lastMonthStats as any).expense) / (lastMonthStats as any).expense) * 100
                : 0
        },
        dailyStats: dailyStatsMap
    };
};

// 添加更新排序的函数
export const updateCategoryOrder = async (items: { id: number; sort_order: number }[]) => {
    const db = await getDB();
    await db.withTransactionAsync(async () => {
        for (const item of items) {
            await db.runAsync(
                'UPDATE categories SET sort_order = ? WHERE id = ?',
                [item.sort_order, item.id]
            );
        }
    });
};

export const updateFavoriteOrder = async (
    type: 'income' | 'expense',
    items: { id: number; sort_order: number }[]
) => {
    const db = await getDB();
    const tableName = type === 'income' ? 'income_favorites' : 'expense_favorites';
    await db.withTransactionAsync(async () => {
        for (const item of items) {
            await db.runAsync(
                `UPDATE ${tableName} SET sort_order = ? WHERE id = ?`,
                [item.sort_order, item.id]
            );
        }
    });
};

// 添加设置相关的函数
export const getSetting = async (key: string): Promise<string | null> => {
    const db = await getDB();
    try {
        // 确保设置表存在
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

        const result = await db.getAllAsync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?;',
            [key]
        );

        return result.length > 0 ? result[0].value : null;
    } catch (error) {
        console.error(`Failed to get setting ${key}:`, error);
        return null;
    }
};

export const updateSetting = async (key: string, value: string): Promise<void> => {
    const db = await getDB();
    try {
        // 确保设置表存在
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

        await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
            [key, value]
        );
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        throw error;
    }
};

export const updateCategory = async (id: number, data: {
    name?: string;
    icon?: string;
}): Promise<void> => {
    const db = await getDB();

    try {
        const updates = Object.entries(data)
            .filter(([_, value]) => value !== undefined)
            .map(([key, _]) => `${key} = ?`)
            .join(', ');

        const values = Object.entries(data)
            .filter(([_, value]) => value !== undefined)
            .map(([_, value]) => value);

        await db.runAsync(`
            UPDATE categories 
            SET ${updates}
            WHERE id = ?;
        `, [...values, id]);
    } catch (error) {
        console.error('Failed to update category:', error);
        throw error;
    }
};

// 添加获取总预算的函数
export const getTotalBudget = async (): Promise<number | null> => {
    const db = await getDB();
    try {
        // 确保设置表存在
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        const result = await db.getAllAsync<{ value: string }>(
            'SELECT value FROM settings WHERE key = ?;',
            ['total_budget']
        );

        return result.length > 0 ? parseFloat(result[0].value) : null;
    } catch (error) {
        console.error('Failed to get total budget:', error);
        return null;
    }
};

// 添加更新总预算的函数
export const updateTotalBudget = async (budget: number): Promise<void> => {
    const db = await getDB();
    try {
        // 确保设置表存在
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
            ['total_budget', budget.toString()]
        );
    } catch (error) {
        console.error('Failed to update total budget:', error);
        throw error;
    }
};