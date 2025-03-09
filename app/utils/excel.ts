import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { getTransactions, addTransaction, getCategories, getTags, addCategory, addTag, getMembers, addMember } from '../constants/Storage';
import * as XLSX from 'xlsx';
import i18n from '../i18n';
import dayjs from 'dayjs';
interface ExportData {
    日期: string;
    类型: string;
    金额: string;
    分类: string;
    备注: string;
    成员: string;
    状态: string;
    标签: string;
}

// 生成Excel文件并返回文件路径
const createExcelFile = async (): Promise<string> => {
    // 获取所有交易记录，传入 -1 表示不分页，获取所有数据
    const { transactions } = await getTransactions({
        page: -1,
        pageSize: -1,
        filter: 'all',
        memberIds: [],
        searchText: ''
    });

    // 获取所有标签，用于将标签ID转换为标签名称
    const allTags = await getTags();
    const tagMap = new Map(allTags.map(tag => [tag.id, tag.name]));

    // 需要将transactions按日期分组后再展平
    const flatTransactions = Object.values(transactions).flat();

    // 转换数据格式
    const data: ExportData[] = flatTransactions.map((t: any) => {
        // 将标签ID数组转换为标签名称字符串
        const tagNames = Array.isArray(t.tags)
            ? t.tags.map((tagId: number) => tagMap.get(tagId) || '').filter(Boolean).join(',')
            : '';

        return {
            日期: t.date,
            类型: t.type === 'income' ? '收入' : '支出',
            金额: Math.abs(t.amount).toFixed(2),
            分类: t.category,
            备注: t.note || '',
            成员: t.member,
            状态: t.refunded ? '已退款' : '正常',
            标签: tagNames
        };
    });

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "交易记录");

    // 生成文件名
    const date = new Date();
    const fileName = `NineCents_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

    // 将工作簿写入二进制字符串
    const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

    // 保存文件
    const filePath = `${FileSystem.documentDirectory}${fileName}.xlsx`;
    await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: FileSystem.EncodingType.Base64
    });

    return filePath;
};

export const generateExcel = async (email: string) => {
    try {
        const filePath = await createExcelFile();

        // 发送邮件
        const available = await MailComposer.isAvailableAsync();
        if (!available) {
            throw new Error(i18n.t('profile.export.emailUnavailable'));
        }

        await MailComposer.composeAsync({
            recipients: [email],
            subject: `NineCents 账单记录 - ${new Date().toLocaleDateString()}`,
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

export const exportToLocal = async (): Promise<void> => {
    try {
        const filePath = await createExcelFile();

        // 检查是否可以分享
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            throw new Error(i18n.t('profile.export.sharingUnavailable'));
        }

        // 分享文件
        await Sharing.shareAsync(filePath, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: i18n.t('profile.export.saveFile'),
            UTI: 'org.openxmlformats.spreadsheetml.sheet'
        });

        return;
    } catch (error) {
        console.error('Export to local failed:', error);
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

        // 将工作表转换为JSON，保留表头
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

        if (!data || data.length < 2) { // 至少需要表头行和一行数据
            throw new Error('No data found in the Excel file');
        }

        // 获取表头行
        const headerRow = data[0] as any;

        // 创建列映射
        const columnMap: { [key: string]: string } = {};

        // 定义可能的列名映射
        const possibleHeaders = {
            date: ['日期', 'date', '时间', 'time', '交易日期', 'transaction date'],
            type: ['类型', 'type', '交易类型', 'transaction type', '收支类型', '收入支出类型'],
            category: ['分类', 'category', '类别', '交易分类', '账目分类'],
            amount: ['金额', 'amount', '交易金额', '数额'],
            note: ['备注', 'note', '说明', 'description', '描述', 'memo'],
            member: ['成员', 'member', '用户', 'user', '人员'],
            tags: ['标签', 'tags', 'tag', '标记']
        };

        // 遍历表头，建立列映射
        Object.keys(headerRow).forEach(colKey => {
            const headerValue = String(headerRow[colKey]).toLowerCase().trim();

            // 检查这个表头值属于哪个字段
            for (const [field, possibleNames] of Object.entries(possibleHeaders)) {
                if (possibleNames.some(name => headerValue === name.toLowerCase())) {
                    columnMap[field] = colKey;
                    break;
                }
            }
        });

        // 检查必要的列是否存在
        const requiredColumns = ['date', 'type', 'category', 'amount'];
        const missingColumns = requiredColumns.filter(col => !columnMap[col]);

        if (missingColumns.length > 0) {
            throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        // 获取所有分类
        const categories = await getCategories();
        const incomeCategories = categories.filter(c => c.type === 'income').map(c => c.name);
        const expenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name);

        // 获取所有标签
        const allTags = await getTags();
        const tagMap = new Map(allTags.map(tag => [tag.name, tag.id]));

        // 获取所有成员
        const members = await getMembers();
        const memberMap = new Map(members.map(member => [member.name, member.id]));

        // 导入交易记录，跳过表头行
        let importCount = 0;

        for (let i = 1; i < data.length; i++) {
            const rowData = data[i] as any;

            // 获取各列数据
            const date = rowData[columnMap.date];
            const type = rowData[columnMap.type];
            const category = rowData[columnMap.category];
            const amount = rowData[columnMap.amount];
            const note = columnMap.note ? rowData[columnMap.note] : '';
            const tagsString = columnMap.tags ? rowData[columnMap.tags] : '';
            const memberName = columnMap.member ? rowData[columnMap.member] : '';

            // 如果关键字段为空，跳过此行
            if (!date || !type || !category || !amount) continue;

            // 处理日期格式
            let transactionDate = '';

            if (typeof date === 'string') {
                // 使用 dayjs 解析各种日期格式
                const formats = [
                    'YYYY-MM-DD', 'YYYY/MM/DD', 'DD-MM-YYYY', 'DD/MM/YYYY',
                    'MM-DD-YYYY', 'MM/DD/YYYY', 'YYYY年MM月DD日', 'DD.MM.YYYY',
                    'YYYY.MM.DD', 'DD-MMM-YYYY', 'MMM DD, YYYY'
                ];

                let parsedDate = null;

                // 尝试所有格式
                for (const format of formats) {
                    const parsed = dayjs(date, format);
                    if (parsed.isValid()) {
                        parsedDate = parsed;
                        break;
                    }
                }

                // 如果没有匹配的格式，尝试自动解析
                if (!parsedDate || !parsedDate.isValid()) {
                    parsedDate = dayjs(date);
                }

                // 如果解析成功，使用 YYYY-MM-DD 格式
                if (parsedDate && parsedDate.isValid()) {
                    transactionDate = parsedDate.format('YYYY-MM-DD');
                } else {
                    // 如果解析失败，使用当前日期
                    transactionDate = dayjs().format('YYYY-MM-DD');
                }
            } else if (date instanceof Date) {
                // 如果是 Date 对象，直接格式化
                transactionDate = dayjs(date).format('YYYY-MM-DD');
            } else if (typeof date === 'number') {
                // 处理 Excel 日期数字格式
                try {
                    // Excel 日期是从 1900-01-01 开始的天数
                    // 减去 25569 是为了转换到 1970-01-01 (Unix 时间戳起点)
                    const excelDate = new Date(Math.round((date - 25569) * 86400 * 1000));
                    transactionDate = dayjs(excelDate).format('YYYY-MM-DD');
                } catch (e) {
                    // 如果转换失败，使用当前日期
                    transactionDate = dayjs().format('YYYY-MM-DD');
                }
            } else {
                // 默认使用当前日期
                transactionDate = dayjs().format('YYYY-MM-DD');
            }

            // 确定交易类型
            let transactionType: 'income' | 'expense';

            if (typeof type === 'string') {
                transactionType = (type.includes('收入') || type.toLowerCase().includes('income'))
                    ? 'income'
                    : 'expense';
            } else {
                // 默认为支出
                transactionType = 'expense';
            }

            // 验证分类，如果不存在则创建
            let transactionCategory = category?.toString() || '';
            let categoryIcon = '📊'; // 默认图标

            if (transactionType === 'income') {
                if (!incomeCategories.includes(transactionCategory)) {
                    // 如果收入分类不存在，创建新分类
                    await addCategory({
                        type: 'income',
                        name: transactionCategory,
                        icon: categoryIcon
                    });
                    // 更新分类列表
                    incomeCategories.push(transactionCategory);
                }
            } else {
                if (!expenseCategories.includes(transactionCategory)) {
                    // 如果支出分类不存在，创建新分类
                    await addCategory({
                        type: 'expense',
                        name: transactionCategory,
                        icon: categoryIcon
                    });
                    // 更新分类列表
                    expenseCategories.push(transactionCategory);
                }
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

            // 处理标签
            const transactionTags: number[] = [];
            if (tagsString) {
                const tagNames = String(tagsString).split(',').map(t => t.trim()).filter(Boolean);

                for (const tagName of tagNames) {
                    if (tagMap.has(tagName)) {
                        // 如果标签已存在，使用现有标签ID
                        transactionTags.push(tagMap.get(tagName)!);
                    } else {
                        // 如果标签不存在，创建新标签
                        try {
                            const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
                            const result = await addTag({
                                name: tagName,
                                color: randomColor
                            }) as any;
                            tagMap.set(tagName, result.lastInsertRowId);
                            transactionTags.push(result.lastInsertRowId);

                            // 更新标签映射

                        } catch (error) {
                            console.error(`Failed to create tag: ${tagName}`, error);
                        }
                    }
                }
            }

            // 处理成员
            let memberId = 0; // 默认成员ID
            if (memberName) {
                if (memberMap.has(memberName)) {
                    memberId = memberMap.get(memberName)!;
                } else {
                    // 如果成员不存在，创建新成员
                    try {
                        await addMember({
                            name: memberName,
                            budget: undefined // 默认预算为空
                        });

                        // 获取新创建成员的ID
                        const newMemberId = await getMembers().then(members =>
                            members.find(m => m.name === memberName)?.id || 0
                        );

                        // 更新成员映射
                        memberMap.set(memberName, newMemberId);
                        memberId = newMemberId;
                    } catch (error) {
                        console.error(`Failed to create member: ${memberName}`, error);
                    }
                }
            }
            // 添加交易记录
            await addTransaction({
                type: transactionType,
                amount: transactionAmount,
                category: transactionCategory,
                categoryIcon: categoryIcon,
                note: note?.toString() || '',
                date: transactionDate,
                member_id: memberId,
                refunded: false,
                tags: transactionTags
            });

            importCount++;
        }

        return importCount;
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}; 