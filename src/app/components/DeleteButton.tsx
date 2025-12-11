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
        <button className={'btn btn-xs btn-ghost text-gray-600 hover:text-red-500 ' + className} onClick={onClick}>
            <XLg size={size} />
            <span className='sr-only'>{srLabel}</span>
        </button>
    );
}
