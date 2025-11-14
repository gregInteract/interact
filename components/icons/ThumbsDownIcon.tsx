import React from 'react';

export const ThumbsDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    {...props} 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c-.806 0-1.533.422-2.031 1.08a9.041 9.041 0 00-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 00.75.75A2.25 2.25 0 007.5 19.5c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H3.374c-1.026 0-1.945-.694-2.054-1.715A12.134 12.134 0 011.25 12c0-.435.023-.868.068-1.285.109-1.022 1.028-1.715 2.054-1.715h3.255zM17.367 13.5l1.07 1.07a.454.454 0 00.639 0l1.07-1.07H21.75a.75.75 0 00.75-.75v-8.25a.75.75 0 00-.75-.75h-2.344a.75.75 0 00-.75.75v7.5h.723z" />
  </svg>
);
