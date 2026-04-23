import React from 'react';

interface PageTransitionProps {
    children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    return (
        <div style={{ opacity: 1, visibility: 'visible' }}>
            {children}
        </div>
    );
};

export default PageTransition;