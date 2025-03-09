import React, { createContext, useContext, useState } from 'react';

interface DataContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const DataContext = createContext<DataContextType>({
    refreshTrigger: 0,
    triggerRefresh: () => { },
});

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <DataContext.Provider value={{ refreshTrigger, triggerRefresh }}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => useContext(DataContext); 