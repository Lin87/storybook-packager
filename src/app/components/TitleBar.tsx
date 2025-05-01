"use client";

import { DashLg, XLg } from "react-bootstrap-icons";

export default function TitleBar() {
    return (
        <div className="absolute top-0 left-0 flex flex-row-reverse w-full pt-2 pr-2 drag-region z-50">
            <div className="flex space-x-1 no-drag">
                <div className="tooltip tooltip-left" data-tip="Minimize">
                    <button className="btn btn-sm btn-circle m-0" onClick={() => window.electronAPI.minimize()}><DashLg /></button>
                </div>
                <div className="tooltip tooltip-left" data-tip="Close">
                    <button className="btn btn-sm btn-circle m-0 text-red-400" onClick={() => window.electronAPI.close()}><XLg /></button>
                </div>
            </div>
        </div>
    );
}
