import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import { getTransactions, addTransaction, getCategories } from '../constants/Storage';
import * as XLSX from 'xlsx';
import i18n from '../i18n';

interface ExportData {
    日期: string;
    类型: string;
    金额: string;
    分类: string;
    备注: string;
    成员: string;
    状态: string;
}

export const generateExcel = async (email: string) => {
    try {
        // 获取所有交易记录
        const { transactions } = await getTransactions();

        // 转换数据格式
        const data: ExportData[] = (transactions as any)?.map((t: any) => ({
            日期: t.date,
            类型: t.type === 'income' ? '收入' : '支出',
            金额: Math.abs(t.amount).toFixed(2),
            分类: t.category,
            备注: t.note || '',
            成员: t.member,
            状态: t.refunded ? '已退款' : '正常'
        }));

        // 生成CSV内容
        let csvContent = '日期,类型,金额,分类,备注,成员,状态\n';
        data.forEach(row => {
            csvContent += `${row.日期},${row.类型},${row.金额},${row.分类},${row.备注},${row.成员},${row.状态}\n`;
        });

        // 生成文件名
        const date = new Date();
        const fileName = `NineCents_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.csv`;

        // 保存文件
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, csvContent);

        // 发送邮件
        const available = await MailComposer.isAvailableAsync();
        if (!available) {
            throw new Error(i18n.t('profile.export.emailUnavailable'));
        }

        await MailComposer.composeAsync({
            recipients: [email],
            subject: `NineCents 账单记录 - ${date.toLocaleDateString()}`,
            body: i18n.t('profile.export.sent'),
            attachments: [filePath]
        });

        // 删除临时文件
        await FileSystem.deleteAsync(filePath);

        return true;
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

export const importExcel = async (fileUri: string): Promise<number> => {
    try {
        // 读取文件内容
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64
        });

        // 解析Excel文件
        const workbook = XLSX.read(fileContent, { type: 'base64' });

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 将工作表转换为JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (!data || data.length === 0) {
            throw new Error('No data found in the Excel file');
        }

        // 获取所有分类
        const categories = await getCategories();
        const incomeCategories = categories.filter(c => c.type === 'income').map(c => c.name);
        const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

        // 导入交易记录
        let importCount = 0;

        for (const row of data) {
            const rowData = row as any;

            // 获取各列数据
            const keys = Object.keys(rowData);
            if (keys.length < 4) continue; // 至少需要4列数据

            const date = rowData[keys[0]];
            const type = rowData[keys[1]];
            const category = rowData[keys[2]];
            const amount = rowData[keys[3]];
            const note = keys.length > 4 ? rowData[keys[4]] : '';

            // 验证和转换数据
            let transactionDate: string;
            if (typeof date === 'string') {
                // 尝试解析日期字符串
                const parsedDate = new Date(date);
                if (!isNaN(parsedDate.getTime())) {
                    transactionDate = parsedDate.toISOString().split('T')[0];
                } else {
                    // 如果无法解析，使用当前日期
                    transactionDate = new Date().toISOString().split('T')[0];
                }
            } else if (date instanceof Date) {
                transactionDate = date.toISOString().split('T')[0];
            } else {
                // 尝试将Excel日期数字转换为日期
                try {
                    const excelDate = XLSX.SSF.parse_date_code(date);
                    const jsDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
                    transactionDate = jsDate.toISOString().split('T')[0];
                } catch (e) {
                    // 如果无法解析，使用当前日期
                    transactionDate = new Date().toISOString().split('T')[0];
                }
            }

            // 确定交易类型
            let transactionType: 'income' | 'expense';
            if (typeof type === 'string') {
                transactionType = type.includes('收入') || type.toLowerCase().includes('income')
                    ? 'income'
                    : 'expense';
            } else {
                // 默认为支出
                transactionType = 'expense';
            }

            // 验证分类
            let transactionCategory = category?.toString() || '';
            if (transactionType === 'income' && !incomeCategories.includes(transactionCategory)) {
                // 如果收入分类不存在，使用第一个收入分类
                transactionCategory = incomeCategories[0] || '其他收入';
            } else if (transactionType === 'expense' && !expenseCategories.includes(transactionCategory)) {
                // 如果支出分类不存在，使用第一个支出分类
                transactionCategory = expenseCategories[0] || '其他支出';
            }

            // 验证金额
            let transactionAmount = 0;
            if (typeof amount === 'number') {
                transactionAmount = Math.abs(amount);
            } else if (typeof amount === 'string') {
                // 尝试将字符串转换为数字
                const parsedAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
                if (!isNaN(parsedAmount)) {
                    transactionAmount = Math.abs(parsedAmount);
                }
            }

            // 如果是支出，金额为负数
            if (transactionType === 'expense') {
                transactionAmount = -transactionAmount;
            }

            // 添加交易记录
            await addTransaction({
                type: transactionType,
                amount: transactionAmount,
                category: transactionCategory,
                categoryIcon: '',
                note: note?.toString() || '',
                date: transactionDate,
                member_id: 1, // 默认成员ID
                refunded: false,
                tags: [] // 默认无标签
            });

            importCount++;
        }

        return importCount;
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}; 