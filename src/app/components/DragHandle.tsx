'use client';

import { GripVertical } from 'react-bootstrap-icons';

interface DragHandleProps {
    attributes?: any;
    listeners?: any;
}

export default function DragHandle({ attributes, listeners }: DragHandleProps) {
    return (
        <button
            className='self-stretch flex items-center justify-center pl-1 text-center cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-800 hover:dark:text-gray-100 select-none'
            {...attributes}
            {...listeners}>
            <GripVertical size={16} />
            <span className='sr-only'>Reorder</span>
        </button>
    );
}
