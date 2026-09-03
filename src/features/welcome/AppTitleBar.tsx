'use client';

import { DashLg, XLg } from 'react-bootstrap-icons';

function AppTitleBar() {
    return (
        <div className='flex flex-row-reverse w-full drag-region z-50 bg-base-200'>
            <div className='flex space-x-1 no-drag'>
                <button className='btn btn-sm m-0 border-0 rounded-none shadow-none text-shadow-none hover:text-white hover:bg-gray-700' onClick={() => window.electronAPI.minimize()} title='Minimize'>
                    <DashLg size={14} />
                </button>
                <button className='btn btn-sm m-0 border-0 rounded-none shadow-none text-shadow-none hover:bg-red-600' onClick={() => window.electronAPI.close()} title='Close'>
                    <XLg size={14} />
                </button>
            </div>
        </div>
    );
}

export default AppTitleBar;
