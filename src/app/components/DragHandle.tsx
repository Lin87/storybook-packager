'use client';

import { GripVertical } from 'react-bootstrap-icons';

interface DragHandleProps {
    attributes?: any;
    listeners?: any;
}

export default function DragHandle({ attributes, listeners }: DragHandleProps) {
    return (
        <button className='btn btn-xs btn-ghost cursor-grab active:cursor-grabbing text-gray-500 hover:text-primary' {...attributes} {...listeners}>
            <GripVertical size={14} />
            <span className='sr-only'>Reorder</span>
        </button>
    );
}
