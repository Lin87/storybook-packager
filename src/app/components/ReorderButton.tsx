'use client';

import { CaretUpFill, CaretDownFill } from 'react-bootstrap-icons';

interface ReorderButtonProps {
    direction: 'up' | 'down';
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    srLabel?: string; // screen reader text
}

export default function ReorderButton({ direction, onClick, disabled = false, className = '', srLabel }: ReorderButtonProps) {
    const Icon = direction === 'up' ? CaretUpFill : CaretDownFill;

    return (
        <button
            className={'btn btn-xs btn-ghost text-gray-600 hover:text-primary ' + className}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}>
            <Icon size={12} />
            <span className='sr-only'>{srLabel ?? `Move ${direction}`}</span>
        </button>
    );
}
