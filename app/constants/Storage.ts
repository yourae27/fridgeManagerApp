import * as SQLite from 'expo-sqlite';

const DB_NAME = 'ninecents.db';

// 创建一个单例数据库连接
let dbInstance: SQLite.SQLiteDatabase | null = null;

const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    }
    return dbInstance;
};

export const initDatabase = async () => {
    const db = await getDB();
    await db.withTransactionAsync(async () => {
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                date TEXT NOT NULL,
                member TEXT NOT NULL DEFAULT '我',
                refunded BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS income_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS expense_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                categoryIcon TEXT NOT NULL,
                note TEXT,
                date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                icon TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                budget REAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS transaction_tags (
                transaction_id INTEGER,
                tag_id INTEGER,
                FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
                FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                PRIMARY KEY(transaction_id, tag_id)
            );
        `);
        // INSERT OR IGNORE INTO categories (type, name, icon) VALUES
        // ('expense', 'Food', '🍽️'),
        // ('expense', 'Transport', '🚗'),
        // ('expense', 'Shopping', '🛍️'),
        // ('income', 'Salary', '💼'),
        // ('income', 'Bonus', '🎁'),
        // ('income', 'Investment', '📈');
        // await db.execAsync(`
        //     INSERT OR IGNORE INTO members (name) VALUES ('我');
        // `);
    });
};

export const addTransaction = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    categoryIcon: string;
    note?: string;
    date: string;
    member?: string;
    refunded?: boolean;
    tags?: number[];
}) => {
    const db = await getDB();
    await db.withTransactionAsync(async () => {
        const result = await db.runAsync(
            'INSERT INTO transactions (type, amount, category, categoryIcon, note, date, member, refunded) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
            [
                data.type,
                data.amount,
                data.category,
                data.categoryIcon,
                data.note || '',
                data.date,
                data.member || '我',
                data.refunded || false
            ]
        );

        if (data.tags?.length) {
            const transactionId = result.lastInsertRowId;
            const tagValues = data.tags.map(tagId => `(${transactionId}, ${tagId})`).join(',');
            await db.runAsync(`
                INSERT INTO transaction_tags (transaction_id, tag_id)
                VALUES ${tagValues};
            `);
        }
    });
};

export const addFavorite = async (data: {
    type: 'income' | 'expense';
    amount: number;
    category: string;
    categoryIcon: string;
    note?: string;
    date: string;
}) => {
    const db = await getDB();
    const tableName = data.type === 'income' ? 'income_favorites' : 'expense_favorites';
    const statement = await db.prepareAsync(`
        INSERT INTO ${tableName} (amount, category, categoryIcon, note, date)
        VALUES (?, ?, ?, ?, ?);
    `);
    try {
        return await statement.executeAsync([
            data.amount,
            data.category,
            data.categoryIcon,
            data.note || '',
            data.date
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
        date: string;
        created_at: string;
    }>(`SELECT * FROM ${tableName} ORDER BY created_at DESC;`);
};

export const getTransactions = async (
    page = 1,
    pageSize = 10,
    filter?: {
        type?: 'income' | 'expense' | 'all',
        members?: string[],
        searchText?: string
    }
) => {
    const db = await getDB();
    const offset = (page - 1) * pageSize;

    let query = `
        SELECT t.* 
        FROM transactions t
        WHERE 1=1
    `;
    const params: any[] = [];

    // 添加类型过滤
    if (filter?.type && filter.type !== 'all') {
        query += ` AND t.type = ?`;
        params.push(filter.type);
    }

    // 添加成员过滤
    if (filter?.members && filter.members.length > 0) {
        query += ` AND t.member IN (${filter.members.map(() => '?').join(',')})`;
        params.push(...filter.members);
    }

    // 添加搜索条件
    if (filter?.searchText) {
        query += ` AND (
            t.note LIKE ? OR 
            t.category LIKE ? OR 
            t.member LIKE ?
        )`;
        const searchPattern = `%${filter.searchText}%`;
        params.push(searchPattern, searchPattern, searchPattern);
    }

    // 添加排序和分页
    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const transactions = await db.getAllAsync(query, params);

    // 获取每个交易的标签
    const transactionsWithTags = await Promise.all(
        transactions.map(async (transaction: any) => {
            const tags = await db.getAllAsync<{ tag_id: number }>(
                'SELECT tag_id FROM transaction_tags WHERE transaction_id = ?;',
                [transaction.id]
            );
            return {
                ...transaction,
                tags: tags.map(t => t.tag_id),
            };
        })
    );

    // 获取总记录数
    let countQuery = `
        SELECT COUNT(*) as total 
        FROM transactions t 
        WHERE 1=1
    `;
    if (filter?.type && filter.type !== 'all') {
        countQuery += ` AND t.type = ?`;
    }
    if (filter?.members && filter.members.length > 0) {
        countQuery += ` AND t.member IN (${filter.members.map(() => '?').join(',')})`;
    }
    if (filter?.searchText) {
        countQuery += ` AND (
            t.note LIKE ? OR 
            t.category LIKE ? OR 
            t.member LIKE ?
        )`;
    }

    const [{ total }] = await db.getAllAsync<{ total: number }>(countQuery, params.slice(0, -2));

    return {
        transactions: transactionsWithTags,
        total,
        hasMore: offset + pageSize < total
    };
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
    date?: string;
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
    member?: string;
    refunded?: boolean;
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
        UPDATE transactions 
        SET ${updates}
        WHERE id = ?;
    `);
    try {
        return await statement.executeAsync([...values, id]);
    } finally {
        await statement.finalizeAsync();
    }
};

export const getCategories = async (type: 'income' | 'expense') => {
    const db = await getDB();
    return await db.getAllAsync<{
        id: number;
        type: 'income' | 'expense';
        name: string;
        icon: string;
        created_at: string;
    }>('SELECT * FROM categories WHERE type = ? ORDER BY created_at ASC;', [type]);
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
    customRange?: { start: Date; end: Date }
) => {
    const db = await getDB();

    // 修改日期过滤条件
    let dateFilter = '';
    const params: any[] = [];

    if (period === 'month') {
        dateFilter = `strftime('%Y-%m', date) = strftime('%Y-%m', ?)`;
        params.push(date.toISOString());
    } else if (period === 'year') {
        dateFilter = `strftime('%Y', date) = strftime('%Y', ?)`;
        params.push(date.toISOString());
    } else {
        dateFilter = `date >= ? AND date <= ?`;
        params.push(
            customRange!.start.toISOString().split('T')[0],
            customRange!.end.toISOString().split('T')[0]
        );
    }

    // 修改查询中的表别名引用
    let query = '';
    if (type === 'tag') {
        query = `
      SELECT 
        tag.name,
        tag.color,
        SUM(ABS(transactions.amount)) as total_amount
      FROM transactions
      JOIN transaction_tags tt ON transactions.id = tt.transaction_id
      JOIN tags tag ON tt.tag_id = tag.id
      WHERE transactions.type = 'expense' 
        AND NOT transactions.refunded
        AND ${dateFilter}
      GROUP BY tag.id
      ORDER BY total_amount DESC
    `;
    } else {
        const groupField = type === 'category' ? 't.category' : 't.member';
        const joinTable = type === 'category' ? 'categories c' : 'members m';
        const joinCondition = type === 'category'
            ? 't.category = c.name AND c.type = "expense"'
            : 't.member = m.name';
        const iconField = type === 'category' ? 'c.icon' : '"👤"';

        query = `
      SELECT 
        ${groupField} as name,
        ${iconField} as icon,
        SUM(ABS(t.amount)) as total_amount
      FROM transactions t
      LEFT JOIN ${joinTable} ON ${joinCondition}
      WHERE t.type = 'expense'
        AND NOT t.refunded
        AND ${dateFilter}
      GROUP BY ${groupField}
      ORDER BY total_amount DESC
    `;
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

    const [monthlyStats] = await db.getAllAsync(monthlyStatsQuery, params);

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
        }
    };
};