'use client';

import { XLg } from 'react-bootstrap-icons';
import React from 'react';

interface DeleteButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    size?: number;
    srLabel?: string;
    className?: string;
}

export default function DeleteButton({ onClick, size = 12, srLabel = 'Delete', className = '' }: DeleteButtonProps) {
    return (
        <button className={'self-stretch flex items-center justify-center text-gray-400 hover:text-red-600 select-none cursor-pointer' + className} onClick={onClick}>
            <XLg size={size} />
            <span className='sr-only'>{srLabel}</span>
        </button>
    );
}
