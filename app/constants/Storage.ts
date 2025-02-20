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

export const getTransactions = async (page = 1, pageSize = 10) => {
    const db = await getDB();
    const offset = (page - 1) * pageSize;

    const transactions = await db.getAllAsync<{
        id: number;
        type: 'income' | 'expense';
        amount: number;
        category: string;
        categoryIcon: string;
        note: string;
        date: string;
        created_at: string;
        refunded: boolean;
        member: string;
    }>(`
        SELECT * FROM transactions 
        ORDER BY date DESC, created_at DESC 
        LIMIT ? OFFSET ?
    `, [pageSize, offset]);

    // 获取每个交易的标签
    const transactionsWithTags = await Promise.all(
        transactions.map(async transaction => {
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

    return transactionsWithTags;
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