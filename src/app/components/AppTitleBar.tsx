"use client";

import { DashLg, XLg } from "react-bootstrap-icons";

function AppTitleBar() {
    return (
        <div className="absolute top-0 left-0 flex flex-row-reverse w-full pt-4 pr-4 drag-region z-50">
            <div className="flex space-x-1 no-drag">
                <div className="tooltip tooltip-bottom" data-tip="Minimize">
                    <button className="btn btn-sm btn-circle m-0" onClick={() => window.electronAPI.minimize()}>
                        <DashLg />
                    </button>
                </div>
                <div className="tooltip tooltip-bottom" data-tip="Close">
                    <button className="btn btn-sm btn-circle m-0 text-red-400" onClick={() => window.electronAPI.close()}>
                        <XLg />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AppTitleBar;
