import React, { createContext, useContext, useState } from 'react';

interface TransactionContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const TransactionContext = createContext<TransactionContextType>({
    refreshTrigger: 0,
    triggerRefresh: () => { },
});

export const TransactionProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <TransactionContext.Provider value={{ refreshTrigger, triggerRefresh }}>
            {children}
        </TransactionContext.Provider>
    );
};

export const useTransactionContext = () => useContext(TransactionContext); 