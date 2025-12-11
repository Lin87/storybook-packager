import { createRoot } from "react-dom/client";
import { XLg } from "react-bootstrap-icons";

export function showToast(message: string, type: "info" | "error" | "success" | "warning" = "info", icon?: React.ReactNode, dismissible = false) {
    const toastRoot = document.getElementById("global-toast");
    
    if (!toastRoot) return;

    const alertClass =
        {
            success: "alert-success",
            error: "alert-error",
            warning: "alert-warning",
            info: "alert-info",
        }[type] || "alert-info";

    const container = document.createElement("div");
    container.className = `alert ${alertClass} text-sm flex items-center justify-between gap-2`;

    toastRoot.appendChild(container);

    const root = createRoot(container);

    const handleClose = () => {
        root.unmount();
        container.remove();
    };

    root.render(
        <>
            <div className="flex items-center gap-2">
                {icon && <span className="text-lg">{icon}</span>}
                <span>{message}</span>
            </div>

            {dismissible && (
                <button className="btn btn-xs btn-ghost ml-2" onClick={handleClose}>
                    <XLg className="text-lg" />
                </button>
            )}
        </>
    );

    // Auto-dismiss if not manually closable
    if (!dismissible) {
        setTimeout(handleClose, 15000);
    }
}
