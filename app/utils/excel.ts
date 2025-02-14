import * as FileSystem from 'expo-file-system';
import * as MailComposer from 'expo-mail-composer';
import { getTransactions } from '../constants/Storage';

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
        const transactions = await getTransactions();

        // 转换数据格式
        const data: ExportData[] = transactions.map(t => ({
            日期: t.date,
            类型: t.type === 'income' ? '收入' : '支出',
            金额: Math.abs(t.amount).toFixed(2),
            分类: t.category,
            备注: t.note || '',
            成员: t.member,
            状态: t.refunded ? '已退款' : '正常'
        }));

        // 生成 CSV 内容
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header =>
                    `"${row[header as keyof ExportData]}"`
                ).join(',')
            )
        ].join('\n');

        // 生成文件名
        const date = new Date();
        const fileName = `NineCents_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.csv`;

        // 保存文件
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(filePath, csvContent);

        // 发送邮件
        const available = await MailComposer.isAvailableAsync();
        if (!available) {
            throw new Error('邮件功能不可用');
        }

        await MailComposer.composeAsync({
            recipients: [email],
            subject: `NineCents 账单记录 - ${date.toLocaleDateString()}`,
            body: '您的账单记录已导出，请查看附件。',
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