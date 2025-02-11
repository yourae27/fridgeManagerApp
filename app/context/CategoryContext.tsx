import React, { createContext, useContext, useState } from 'react';

interface CategoryContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const CategoryContext = createContext<CategoryContextType>({
    refreshTrigger: 0,
    triggerRefresh: () => { },
});

export const CategoryProvider = ({ children }: { children: React.ReactNode }) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <CategoryContext.Provider value={{ refreshTrigger, triggerRefresh }}>
            {children}
        </CategoryContext.Provider>
    );
};

export const useCategoryContext = () => useContext(CategoryContext); 