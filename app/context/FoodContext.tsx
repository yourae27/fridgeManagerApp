import React, { createContext, useContext, useState } from 'react';

interface FoodContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const FoodContext = createContext<FoodContextType>({
    refreshTrigger: 0,
    triggerRefresh: () => { },
});

export const FoodProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <FoodContext.Provider value={{ refreshTrigger, triggerRefresh }}>
            {children}
        </FoodContext.Provider>
    );
};

export const useFoodContext = () => useContext(FoodContext); 