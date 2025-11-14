import React from 'react';

interface LogoProps {
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => (
    <svg 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        xmlns="http://www.w3.org/2000/svg" 
        // Default size is 56px (w-14, h-14). The passed className can override this.
        className={`w-14 h-14 text-sky-500 ${className || ''}`}
    >
        <path d="M5 9.2h3V19H5zM10.6 5h3v14h-3zm5.6 8H19v6h-2.8z"/>
    </svg>
);