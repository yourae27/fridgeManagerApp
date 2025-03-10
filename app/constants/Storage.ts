import * as SQLite from 'expo-sqlite';
import { getLocales } from 'expo-localization';

const DB_NAME = 'fridge_manager.db';

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

// 添加历史记录相关的类型定义
export interface HistoryRecord {
    id: number;
    action_type: 'use' | 'discard' | 'add' | 'move';
    item_name: string;
    quantity: number | null;
    unit: string | null;
    storage_type: 'refrigerated' | 'frozen';
    action_date: string;
}

export const initDatabase = async () => {
    const db = getDBSync();
    try {
        // 创建表结构
        db.execSync(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS food_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity REAL,
                unit TEXT,
                storage_type TEXT NOT NULL,
                date_added TEXT NOT NULL,
                expiry_date TEXT,
                opened_date TEXT,
                opened_expiry_days INTEGER,
                expiry_days INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS favorite_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                quantity REAL,
                unit TEXT,
                expiry_days INTEGER,
                opened_expiry_days INTEGER
            );
        `);

        // 创建历史记录表
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity REAL,
                unit TEXT,
                storage_type TEXT NOT NULL,
                action_date TEXT NOT NULL
            )
        `);
    } catch (error) {
        console.error('初始化数据库失败:', error);
        throw error;
    }
};

// 添加设置相关的函数
export const getSetting = async (key: string): Promise<string | null> => {
    const db = await getDB();
    try {
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
        await db.runAsync(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
            [key, value]
        );
    } catch (error) {
        console.error(`Failed to update setting ${key}:`, error);
        throw error;
    }
};

// 食品相关函数

export const addFoodItem = async (item: {
    name: string;
    quantity?: number;
    unit?: string;
    storage_type: 'refrigerated' | 'frozen';
    date_added: string;
    expiry_date?: string;
    opened_date?: string;
    opened_expiry_days?: number;
    expiry_days?: number;
}) => {
    const db = await getDB();
    try {
        const result = await db.runAsync(
            `INSERT INTO food_items (name, quantity, unit, storage_type, date_added, expiry_date, opened_date, opened_expiry_days, expiry_days)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                item.name,
                item.quantity || null,
                item.unit || null,
                item.storage_type,
                item.date_added,
                item.expiry_date || null,
                item.opened_date || null,
                item.opened_expiry_days || null,
                item.expiry_days || null
            ]
        );
        return result;
    } catch (error) {
        console.error('添加食品失败:', error);
        throw error;
    }
};

export const getFoodItems = async (storageType?: 'refrigerated' | 'frozen', searchText?: string) => {
    const db = await getDB();
    try {
        let query = 'SELECT * FROM food_items';
        const params: any[] = [];

        if (storageType) {
            query += ' WHERE storage_type = ?';
            params.push(storageType);

            if (searchText) {
                query += ' AND name LIKE ?';
                params.push(`%${searchText}%`);
            }
        } else if (searchText) {
            query += ' WHERE name LIKE ?';
            params.push(`%${searchText}%`);
        }

        query += ' ORDER BY date_added DESC';

        const result = await db.getAllAsync(query, params);
        return result;
    } catch (error) {
        console.error('获取食品列表失败:', error);
        throw error;
    }
};

export const updateFoodItem = async (id: number, updates: {
    name?: string;
    quantity?: number;
    unit?: string;
    storage_type?: 'refrigerated' | 'frozen';
    expiry_date?: string;
    opened_date?: string;
    opened_expiry_days?: number;
    expiry_days?: number;
}) => {
    const db = await getDB();
    try {
        let setClause = '';
        const params: any[] = [];

        Object.entries(updates).forEach(([key, value], index) => {
            if (index > 0) setClause += ', ';
            setClause += `${key} = ?`;
            params.push(value);
        });

        params.push(id);

        const result = await db.runAsync(`UPDATE food_items SET ${setClause} WHERE id = ?`, params);
        return result;
    } catch (error) {
        console.error('更新食品失败:', error);
        throw error;
    }
};

export const deleteFoodItem = async (id: number) => {
    const db = await getDB();
    try {
        const result = await db.runAsync('DELETE FROM food_items WHERE id = ?', [id]);
        return result;
    } catch (error) {
        console.error('删除食品失败:', error);
        throw error;
    }
};

// 常买清单相关函数

export const addFavoriteItem = async (item: {
    name: string;
    quantity?: number;
    unit?: string;
    expiry_days?: number;
    opened_expiry_days?: number;
}) => {
    const db = await getDB();
    try {
        const result = await db.runAsync(
            `INSERT INTO favorite_items (name, quantity, unit, expiry_days, opened_expiry_days)
             VALUES (?, ?, ?, ?, ?)`,
            [
                item.name,
                item.quantity || null,
                item.unit || null,
                item.expiry_days || null,
                item.opened_expiry_days || null
            ]
        );
        return result;
    } catch (error) {
        console.error('添加到常买清单失败:', error);
        throw error;
    }
};

export const getFavoriteItems = async () => {
    const db = await getDB();
    try {
        const result = await db.getAllAsync('SELECT * FROM favorite_items ORDER BY name');
        return result;
    } catch (error) {
        console.error('获取常买清单失败:', error);
        throw error;
    }
};

export const updateFavoriteItem = async (id: number, updates: {
    name?: string;
    quantity?: number;
    unit?: string;
    expiry_days?: number;
    opened_expiry_days?: number;
}) => {
    const db = await getDB();
    try {
        let setClause = '';
        const params: any[] = [];

        Object.entries(updates).forEach(([key, value], index) => {
            if (index > 0) setClause += ', ';
            setClause += `${key} = ?`;
            params.push(value);
        });

        params.push(id);

        const result = await db.runAsync(`UPDATE favorite_items SET ${setClause} WHERE id = ?`, params);
        return result;
    } catch (error) {
        console.error('更新常买物品失败:', error);
        throw error;
    }
};

export const deleteFavoriteItem = async (id: number) => {
    const db = await getDB();
    try {
        const result = await db.runAsync('DELETE FROM favorite_items WHERE id = ?', [id]);
        return result;
    } catch (error) {
        console.error('删除常买物品失败:', error);
        throw error;
    }
};

// 设置相关函数
export const getWarningDays = async (): Promise<number> => {
    try {
        const result = await getSetting('warning_days');
        return result ? parseInt(result) : 3; // 默认为3天
    } catch (error) {
        console.error('获取警示时长失败:', error);
        return 3; // 出错时返回默认值
    }
};

export const setWarningDays = async (days: number): Promise<void> => {
    try {
        await updateSetting('warning_days', days.toString());
    } catch (error) {
        console.error('更新警示时长失败:', error);
        throw error;
    }
};

// 添加历史记录
export const addHistory = async (record: Omit<HistoryRecord, 'id'>) => {
    try {
        const db = await getDB();
        await db.runAsync(`
            INSERT INTO history (action_type, item_name, quantity, unit, storage_type, action_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [record.action_type, record.item_name, record.quantity, record.unit, record.storage_type, record.action_date]);
    } catch (error) {
        console.error('添加历史记录失败:', error);
        throw error;
    }
};

// 获取历史记录
export const getHistory = async () => {
    try {
        const db = await getDB();
        const result = await db.getAllAsync<HistoryRecord>(`
            SELECT * FROM history 
            ORDER BY action_date DESC
        `);
        return result;
    } catch (error) {
        console.error('获取历史记录失败:', error);
        throw error;
    }
};