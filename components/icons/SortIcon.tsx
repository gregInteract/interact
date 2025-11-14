import React from 'react';

export const SortIcon: React.FC<{ direction?: 'ascending' | 'descending' }> = ({ direction }) => {
  return (
    <span className="inline-block w-4 h-4 ml-1.5 relative">
      <svg className={`absolute w-4 h-4 -mt-2 transition-opacity ${direction === 'ascending' ? 'opacity-100 text-white' : 'opacity-40 hover:opacity-70'}`} fill="currentColor" viewBox="0 0 16 16">
        <path d="m7.247 4.86-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
      </svg>
      <svg className={`absolute w-4 h-4 mt-1 transition-opacity ${direction === 'descending' ? 'opacity-100 text-white' : 'opacity-40 hover:opacity-70'}`} fill="currentColor" viewBox="0 0 16 16">
        <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
      </svg>
    </span>
  );
};
