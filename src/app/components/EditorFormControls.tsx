'use client';

import clsx from 'clsx';
import type { HTMLInputTypeAttribute, ReactNode, Ref } from 'react';

interface FieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: HTMLInputTypeAttribute;
    placeholder?: string;
    onBlur?: () => void;
    inputRef?: Ref<HTMLInputElement>;
}

export function Field({
    label,
    value,
    onChange,
    type = 'text',
    placeholder = '',
    onBlur,
    inputRef,
}: FieldProps) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <input
                className='input input-md w-full'
                type={type}
                value={value}
                placeholder={placeholder || label}
                onChange={(event) => onChange(event.target.value)}
                onBlur={onBlur}
                ref={inputRef}
            />
        </label>
    );
}

interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}

export function SelectField({ label, value, onChange, children }: SelectFieldProps) {
    return (
        <label className='floating-label'>
            <span>{label}</span>
            <select className='select select-bordered w-full' value={value} onChange={(event) => onChange(event.target.value)}>
                {children}
            </select>
        </label>
    );
}

interface UploadFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    uploadLabel: string;
    onUpload: () => void;
    uploadDisabled?: boolean;
}

export function UploadField({
    label,
    value,
    onChange,
    placeholder,
    uploadLabel,
    onUpload,
    uploadDisabled = false,
}: UploadFieldProps) {
    return (
        <div className='flex flex-row gap-2'>
            <label className='input floating-label flex-1'>
                <span>{label}</span>
                <input value={value} placeholder={placeholder || label} onChange={(event) => onChange(event.target.value)} />
            </label>
            <button type='button' className='btn btn-md btn-soft' onClick={onUpload} disabled={uploadDisabled}>
                {uploadLabel}
            </button>
        </div>
    );
}

interface ToggleProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange }: ToggleProps) {
    return (
        <label className='label cursor-pointer justify-start gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3 flex-1 w-full'>
            <input type='checkbox' className='checkbox checkbox-sm' checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className='label-text'>{label}</span>
        </label>
    );
}

interface EditorPanelProps {
    children: ReactNode;
    className?: string;
}

export function EditorPanel({ children, className = 'space-y-4 p-4' }: EditorPanelProps) {
    return (
        <section className={clsx('rounded-box border border-base-300 bg-base-200', className)}>
            {children}
        </section>
    );
}

interface ArraySectionProps {
    children: ReactNode;
    addLabel: string;
    onAdd: () => void;
}

export function ArraySection({ children, addLabel, onAdd }: ArraySectionProps) {
    return (
        <section className='space-y-4'>
            <button type='button' className='btn btn-sm btn-accent btn-soft btn-block' onClick={onAdd}>
                {addLabel}
            </button>
            <div className='space-y-4 px-4'>{children}</div>
        </section>
    );
}
